import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = ['harness/stage2-tasks.json', 'docs/STAGE2_PRD.md', 'docs/STAGE2_BUILD_PLAN.md'];
const errors = [];
const statuses = new Set(['todo', 'ready', 'in_progress', 'blocked', 'done']);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const stringList = (value) => Array.isArray(value) && value.every(nonempty);

function safePath(relative) {
  if (!nonempty(relative) || relative.includes('\\') || path.isAbsolute(relative) || relative.includes(':')) return false;
  const normalized = relative.endsWith('/') ? relative.slice(0, -1) : relative;
  if (normalized.split('/').some((part) => !part || part === '.' || part === '..')) return false;
  return path.resolve(root, normalized).startsWith(root + path.sep);
}

function readRequired(relative) {
  if (!safePath(relative)) throw new Error(`Unsafe relative path: ${relative}`);
  const absolute = path.join(root, relative);
  if (!statSync(absolute).isFile()) throw new Error(`Not a file: ${relative}`);
  const content = readFileSync(absolute, 'utf8');
  if (!content.trim()) throw new Error(`Empty file: ${relative}`);
  return content;
}

function finish(status, summary, nextActions, code) {
  console.log(JSON.stringify({ status, summary, next_actions: nextActions, artifacts, errors }, null, 2));
  process.exitCode = code;
}

try {
  const manifest = JSON.parse(readRequired('harness/stage2-tasks.json'));
  const baseline = JSON.parse(readRequired('harness/tasks.json'));
  const prd = readRequired('docs/STAGE2_PRD.md');
  readRequired('docs/STAGE2_BUILD_PLAN.md');
  if (manifest.schema_version !== 1) errors.push('Unsupported Stage 2 manifest schema_version.');
  if (manifest.scope_status !== 'approved') errors.push('Stage 2 scope must be explicitly approved.');
  if (!['not_started', 'in_progress', 'complete'].includes(manifest.implementation_status)) errors.push('Invalid Stage 2 implementation_status.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.scope_confirmed_on ?? '')) errors.push('Missing Stage 2 confirmation date.');
  if (manifest.app_root !== 'web') errors.push('Expected app_root: web.');
  if (manifest.baseline_manifest !== 'harness/tasks.json' || baseline.scope_status !== 'approved') errors.push('Baseline manifest reference is invalid.');
  if (manifest.requirements !== 'docs/STAGE2_PRD.md') errors.push('Stage 2 requirements path is invalid.');
  if (!stringList(manifest.documents)) throw new Error('documents must be an array of nonempty paths.');
  for (const required of ['AGENTS.md', 'README.md', 'docs/STATUS.md', 'docs/STAGE2_PRD.md', 'docs/STAGE2_BUILD_PLAN.md', 'docs/AGENT_PROCEDURES.md']) {
    if (!manifest.documents.includes(required)) errors.push(`Required document absent: ${required}`);
  }
  for (const document of manifest.documents) {
    try { readRequired(document); } catch (error) { errors.push(error.message); }
  }

  const criteria = [...prd.matchAll(/^- (S2-AC-\d{2}):/gm)].map((match) => match[1]);
  const criterionSet = new Set(criteria);
  if (!criteria.length || criterionSet.size !== criteria.length) errors.push('Stage 2 acceptance criteria are missing or duplicated.');
  if (!Array.isArray(manifest.tasks) || !manifest.tasks.length) throw new Error('Stage 2 task queue is empty or invalid.');

  const tasks = new Map();
  const covered = new Set();
  for (const task of manifest.tasks) {
    if (!task || typeof task !== 'object' || !/^S2-\d{2}$/.test(task.id ?? '')) {
      errors.push('Every Stage 2 task needs an ID such as S2-01.');
      continue;
    }
    if (tasks.has(task.id)) errors.push(`Duplicate task ID: ${task.id}`);
    tasks.set(task.id, task);
    for (const field of ['title', 'lane']) if (!nonempty(task[field])) errors.push(`${task.id}: missing ${field}.`);
    if (!statuses.has(task.status)) errors.push(`${task.id}: invalid status.`);
    if (task.owner !== null && !nonempty(task.owner)) errors.push(`${task.id}: owner must be null or a name.`);
    if (['in_progress', 'done'].includes(task.status) && !nonempty(task.owner)) errors.push(`${task.id}: active/completed task needs an owner.`);
    for (const field of ['depends_on', 'paths', 'acceptance', 'checks', 'evidence']) {
      if (!stringList(task[field])) errors.push(`${task.id}: ${field} must be an array of nonempty strings.`);
    }
    for (const field of ['paths', 'acceptance', 'checks']) if (!task[field]?.length) errors.push(`${task.id}: ${field} cannot be empty.`);
    if (stringList(task.paths)) for (const ownedPath of task.paths) {
      if (!safePath(ownedPath) || ownedPath.startsWith('everything-claude-code/')) errors.push(`${task.id}: unsafe edit boundary ${ownedPath}.`);
    }
    if (stringList(task.acceptance)) for (const criterion of task.acceptance) {
      if (!criterionSet.has(criterion)) errors.push(`${task.id}: unknown acceptance criterion ${criterion}.`);
      covered.add(criterion);
    }
    if (task.status === 'done' && !task.evidence?.length) errors.push(`${task.id}: done requires verification evidence.`);
    if (task.status === 'blocked' && !nonempty(task.blocker)) errors.push(`${task.id}: blocked requires a blocker description.`);
  }
  for (const criterion of criteria) if (!covered.has(criterion)) errors.push(`Unassigned acceptance criterion: ${criterion}`);

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
    for (const dependency of tasks.get(id)?.depends_on ?? []) if (tasks.has(dependency)) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of tasks.keys()) visit(id);
  const doneCount = [...tasks.values()].filter((task) => task.status === 'done').length;
  if (manifest.implementation_status === 'not_started' && [...tasks.values()].some((task) => task.status !== 'todo')) {
    errors.push('Stage 2 is marked not_started but a task has started.');
  }
  if (manifest.implementation_status === 'complete' && doneCount !== tasks.size) {
    errors.push('Stage 2 is marked complete before all tasks are done.');
  }

  if (errors.length) finish('error', 'Stage 2 planning harness validation failed.', ['Fix the listed planning errors and rerun.'], 1);
  else {
    const ready = [...tasks.values()].filter((task) => task.status === 'todo' && task.depends_on.every((id) => tasks.get(id)?.status === 'done'));
    const nextActions = ready.map((task) => `After the presentation freeze, assign ${task.id}: ${task.title}`);
    finish('success', `Stage 2 planning harness valid: ${manifest.documents.length} documents, ${tasks.size} tasks (${doneCount} done), ${criteria.length} acceptance criteria. Application readiness was not assessed.`, nextActions.length ? nextActions : ['Review in-progress or completed task evidence.'], 0);
  }
} catch (error) {
  errors.push(error.message);
  finish('error', 'Could not validate the Stage 2 planning harness.', ['Repair the missing or invalid input and rerun.'], 1);
}
