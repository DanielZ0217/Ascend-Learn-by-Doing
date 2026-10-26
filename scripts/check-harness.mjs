import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const artifacts = ['harness/tasks.json', 'docs/PRD.md'];
const statuses = new Set(['todo', 'ready', 'in_progress', 'blocked', 'done']);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const stringList = (value) => Array.isArray(value) && value.every(nonempty);

function report(status, summary, nextActions, exitCode) {
  console.log(JSON.stringify({ status, summary, next_actions: nextActions, artifacts, errors }, null, 2));
  process.exitCode = exitCode;
}

function safePath(relative) {
  if (!nonempty(relative) || relative.includes('\\') || path.isAbsolute(relative)) return false;
  const parts = relative.split('/');
  if (parts.some((part) => part === '..' || part === '.') || relative.includes(':')) return false;
  const resolved = path.resolve(root, relative);
  return resolved.startsWith(root + path.sep);
}

function readRequired(relative) {
  if (!safePath(relative)) throw new Error(`Unsafe relative path: ${relative}`);
  const absolute = path.join(root, relative);
  if (!statSync(absolute).isFile()) throw new Error(`Not a file: ${relative}`);
  const content = readFileSync(absolute, 'utf8');
  if (!content.trim()) throw new Error(`Empty file: ${relative}`);
  return content;
}

try {
  const manifest = JSON.parse(readRequired('harness/tasks.json'));
  const prd = readRequired('docs/PRD.md');
  if (manifest.schema_version !== 1) errors.push('Unsupported manifest schema_version.');
  if (manifest.scope_status !== 'approved') errors.push('Product scope must be explicitly approved.');
  if (manifest.app_root !== 'web') errors.push('Expected the documented app_root: web.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.scope_confirmed_on ?? '')) errors.push('Missing scope confirmation date.');
  if (!stringList(manifest.documents)) throw new Error('documents must be an array of nonempty paths.');
  if (manifest.decision_round !== undefined) {
    if (!['open', 'resolved'].includes(manifest.decision_round?.status)) errors.push('Invalid decision-round status.');
    if (!manifest.documents.includes(manifest.decision_round?.document)) errors.push('Decision-round document must appear in documents.');
  }

  const requiredDocs = ['AGENTS.md', 'README.md', 'docs/PRD.md', 'docs/BUILD_PLAN.md', 'docs/AGENT_HARNESS.md', 'docs/STATUS.md'];
  for (const required of requiredDocs) {
    if (!manifest.documents.includes(required)) errors.push(`Required document absent from manifest: ${required}`);
  }
  for (const document of manifest.documents) {
    try { readRequired(document); } catch (error) { errors.push(error.message); }
  }

  const criteria = [...prd.matchAll(/^- (AC-\d{2}):/gm)].map((match) => match[1]);
  const criterionSet = new Set(criteria);
  if (!criteria.length) errors.push('No acceptance criteria found in the PRD.');
  if (criterionSet.size !== criteria.length) errors.push('Duplicate PRD acceptance IDs.');
  if (!Array.isArray(manifest.tasks) || !manifest.tasks.length) throw new Error('Task queue is empty or invalid.');

  const tasks = new Map();
  const covered = new Set();
  for (const task of manifest.tasks) {
    if (!task || typeof task !== 'object' || !/^T\d{2}$/.test(task.id ?? '')) {
      errors.push('Every task needs an ID such as T01.');
      continue;
    }
    if (tasks.has(task.id)) errors.push(`Duplicate task ID: ${task.id}`);
    tasks.set(task.id, task);
    for (const field of ['title', 'lane']) {
      if (!nonempty(task[field])) errors.push(`${task.id}: missing ${field}.`);
    }
    if (!statuses.has(task.status)) errors.push(`${task.id}: invalid status.`);
    if (task.owner !== null && !nonempty(task.owner)) errors.push(`${task.id}: owner must be null or a name.`);
    if (['in_progress', 'done'].includes(task.status) && !nonempty(task.owner)) errors.push(`${task.id}: active/completed task needs an owner.`);
    for (const field of ['depends_on', 'paths', 'acceptance', 'checks', 'evidence']) {
      if (!stringList(task[field])) errors.push(`${task.id}: ${field} must be an array of nonempty strings.`);
    }
    for (const field of ['paths', 'acceptance', 'checks']) {
      if (!task[field]?.length) errors.push(`${task.id}: ${field} cannot be empty.`);
    }
    if (stringList(task.paths)) {
      for (const ownedPath of task.paths) {
        if (!safePath(ownedPath) || ownedPath.split('/')[0] === 'everything-claude-code') {
          errors.push(`${task.id}: unsafe or protected edit boundary ${ownedPath}.`);
        }
      }
    }
    if (stringList(task.acceptance)) {
      for (const criterion of task.acceptance) {
        if (!criterionSet.has(criterion)) errors.push(`${task.id}: unknown acceptance criterion ${criterion}.`);
        covered.add(criterion);
      }
    }
    if (task.status === 'done' && !task.evidence?.length) errors.push(`${task.id}: done requires verification evidence.`);
    if (task.status === 'blocked' && !nonempty(task.blocker)) errors.push(`${task.id}: blocked requires a blocker description.`);
  }

  for (const criterion of criteria) {
    if (!covered.has(criterion)) errors.push(`Unassigned acceptance criterion: ${criterion}`);
  }
  for (const task of tasks.values()) {
    if (!stringList(task.depends_on)) continue;
    for (const dependency of task.depends_on) {
      if (!tasks.has(dependency)) errors.push(`${task.id}: unknown dependency ${dependency}.`);
      if (['ready', 'in_progress', 'done'].includes(task.status) && tasks.get(dependency)?.status !== 'done') {
        errors.push(`${task.id}: ${task.status} while prerequisite ${dependency} is unfinished.`);
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) { errors.push(`Dependency cycle at ${id}.`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    const task = tasks.get(id);
    if (stringList(task?.depends_on)) {
      for (const dependency of task.depends_on) if (tasks.has(dependency)) visit(dependency);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of tasks.keys()) visit(id);

  if (errors.length) {
    report('error', 'Planning harness validation failed.', ['Fix the listed planning errors and rerun this command.'], 1);
  } else {
    const ready = [...tasks.values()].filter((task) => ['todo', 'ready'].includes(task.status) && task.depends_on.every((id) => tasks.get(id).status === 'done'));
    const nextActions = manifest.decision_round?.status === 'open'
      ? [`Complete the user-requested decision round in ${manifest.decision_round.document} and synchronize the plan before assigning implementation work.`]
      : ready.length ? ready.map((task) => `Assign ${task.id}: ${task.title}`) : ['Review in-progress/blocked work or final integration evidence.'];
    report('success', `Planning harness valid: ${manifest.documents.length} documents, ${tasks.size} tasks, ${criteria.length} acceptance criteria. Application readiness was not assessed.`, nextActions, 0);
  }
} catch (error) {
  errors.push(error.message);
  report('error', 'Could not validate the planning harness.', ['Repair the missing/invalid input and rerun; do not mark application work complete.'], 1);
}
