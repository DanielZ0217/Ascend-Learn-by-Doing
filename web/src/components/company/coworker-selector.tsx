"use client";

import { useRef, type KeyboardEvent } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  ArrowRight, BriefcaseBusiness, ChartNoAxesCombined, ChevronRight,
  Code2, Headset, Megaphone, Users,
} from "lucide-react";
import { roleIds, roleLabels, type AgentProfile, type RoleId } from "@/lib/contracts";

export const roleDetails: Record<RoleId, {
  number: string; kicker: string; summary: string; icon: typeof Code2; color: string;
}> = {
  "software-engineer": { number: "01", kicker: "BUILD & DEBUG", summary: "Solve practical engineering problems with working code.", icon: Code2, color: "#526cc3" },
  "sales-marketing": { number: "02", kicker: "CONNECT & CONVINCE", summary: "Practice a pitch with a customer who asks real questions.", icon: Megaphone, color: "#d78077" },
  "customer-support": { number: "03", kicker: "LISTEN & RESOLVE", summary: "Help a customer through a problem with care and clarity.", icon: Headset, color: "#5c9882" },
  "product-manager": { number: "04", kicker: "SHAPE THE WHAT", summary: "Turn customer needs into a focused product brief.", icon: BriefcaseBusiness, color: "#c89d63" },
  "data-analyst": { number: "05", kicker: "FIND THE SIGNAL", summary: "Use data to make a grounded recommendation.", icon: ChartNoAxesCombined, color: "#aa83bc" },
};

const bubbleSpring = { type: "spring" as const, stiffness: 430, damping: 34, mass: 0.85 };
const cursorSpring = { type: "spring" as const, stiffness: 500, damping: 38, mass: 0.75 };

type Props = {
  profiles: AgentProfile[];
  activeRole: RoleId;
  selectedRole: RoleId | null;
  meetingProgress: number;
  enteringRole: boolean;
  reducedMotion: boolean;
  onPreview: (role: RoleId) => void;
  onSelect: (role: RoleId) => void;
  onEnter: () => void;
};

export function CoworkerSelector({
  profiles, activeRole, selectedRole, meetingProgress, enteringRole,
  reducedMotion, onPreview, onSelect, onEnter,
}: Props) {
  const buttons = useRef<Partial<Record<RoleId, HTMLButtonElement | null>>>({});
  const detailRole = selectedRole ?? activeRole;
  const activeProfile = profiles.find((profile) => profile.roleId === detailRole);
  const activeDetail = roleDetails[detailRole];
  const confirmed = selectedRole !== null;
  const meeting = detailRole === "sales-marketing" || detailRole === "customer-support";
  const transition = reducedMotion ? { duration: 0 } : bubbleSpring;

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const current = roleIds.indexOf(activeRole);
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next = roleIds[(current + step + roleIds.length) % roleIds.length];
    onPreview(next);
    buttons.current[next]?.focus();
  }

  return <>
    <LayoutGroup id="coworker-selection">
      <div className="team-list" onKeyDown={handleMenuKeyDown} onMouseLeave={() => { if (selectedRole) onPreview(selectedRole); }} aria-label="Coworker character selection">
        {roleIds.map((roleId) => {
          const detail = roleDetails[roleId];
          const Icon = detail.icon;
          const profile = profiles.find((item) => item.roleId === roleId);
          const active = activeRole === roleId;
          const chosen = selectedRole === roleId;
          return <motion.div key={roleId} layout className="team-card-wrap" transition={{ layout: transition }}>
            {active && <motion.span
              layoutId="team-selection-cursor"
              className="team-selection-cursor"
              transition={reducedMotion ? { duration: 0 } : cursorSpring}
              aria-hidden="true"
            ><ChevronRight size={20} strokeWidth={3}/></motion.span>}
            <motion.button
              ref={(node) => { buttons.current[roleId] = node; }}
              layout
              initial={false}
              transition={{ layout: transition }}
              type="button"
              className={`team-card${active ? " active" : ""}${chosen ? " committed" : ""}`}
              aria-pressed={chosen}
              aria-describedby={chosen || (!selectedRole && active) ? "role-preview-description" : undefined}
              onMouseEnter={() => onPreview(roleId)}
              onFocus={() => onPreview(roleId)}
              onClick={() => onSelect(roleId)}
            >
              <span className="team-card-index">{detail.number}</span>
              <span className="team-card-icon" style={{ color: detail.color, backgroundColor: `${detail.color}25` }}><Icon size={21} strokeWidth={1.8}/></span>
              <span className="team-card-text"><strong>{roleLabels[roleId]}</strong><small>{profile?.name ?? "Your coworker"} <span>·</span> {detail.kicker.toLowerCase()}</small>
                <AnimatePresence initial={false}>{active && <motion.span
                  className="team-card-preview"
                  initial={reducedMotion ? false : { opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -3, transition: { duration: 0.08 } }}
                  transition={{ duration: 0.14, delay: 0.07 }}
                >{detail.summary}</motion.span>}</AnimatePresence>
              </span>
              <ArrowRight className="team-card-arrow" size={18}/>
            </motion.button>
          </motion.div>;
        })}
      </div>
    </LayoutGroup>
    <div className="role-selection" id="role-preview-description" aria-live="polite">
      <div className="role-selection-top"><span className="panel-eyebrow">{confirmed ? "SELECTED PATH" : "PREVIEWING PATH"} / {activeDetail.number}</span><span className="selection-pip"/></div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={detailRole}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -5 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.19, ease: "easeOut" }}
        >
          <h3>{activeProfile?.name ?? roleLabels[activeRole]} <span>{confirmed ? "is ready to help." : "is on the team."}</span></h3>
          <p>{activeDetail.summary}</p>
        </motion.div>
      </AnimatePresence>
      {confirmed && meeting && <p className="meeting-note"><Users size={15}/>{meetingProgress < 1 ? "Heading to the meeting room with your customer…" : "Your customer has arrived in the meeting room."}</p>}
      {confirmed ? <motion.button type="button" className="enter-role" onClick={onEnter} disabled={enteringRole}
        whileTap={reducedMotion ? undefined : { scale: 0.985 }}>
        {enteringRole ? "Entering the workspace…" : `Start with ${activeProfile?.name?.split(" ")[0] ?? "your coach"}`}
        <ArrowRight size={18}/>
      </motion.button> : <p className="selection-instruction">Hover to meet a coworker. Click or press Enter to choose them.</p>}
    </div>
  </>;
}
