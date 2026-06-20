import type { Emotion } from '@/types/db';
import styles from './CloudAvatar.module.css';

interface Props {
  emotion?: Emotion;
  size?: number;
  onAvatarClick?: () => void;
  /** Customize Cloud later (Phase 5). Defaults reflect current Phase 1 Cloud. */
  earColor?: string;
  hornEnabled?: boolean;
}

const EAR_DEFAULT = '#ffd6e0';
const HORN_DEFAULT = '#ffe08a';

export default function CloudAvatar({
  emotion = 'idle',
  size = 140,
  onAvatarClick,
  earColor = EAR_DEFAULT,
  hornEnabled = false,
}: Props) {
  const cheeks = emotion === 'blush';
  const sad = emotion === 'sad';
  const surprised = emotion === 'surprise';
  const happy = emotion === 'happy' || emotion === 'talking';
  const thinking = emotion === 'thinking';

  return (
    <div
      className={styles.avatar}
      style={{ ['--cloud-avatar-size' as string]: `${size}px` }}
      onClick={onAvatarClick}
      role={onAvatarClick ? 'button' : undefined}
      aria-label={`Cloud feels ${emotion}`}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        {/* ambient sparkles for happy/surprise */}
        {happy && <Sparkles />}
        {surprised && <Sparkles count={3} />}

        {/* cloud body */}
        <g className={styles.cloudBody}>
          <ellipse cx="60" cy="78" rx="46" ry="22" fill="#ffffff" />
          <ellipse cx="36" cy="62" rx="18" ry="16" fill="#ffffff" />
          <ellipse cx="60" cy="52" rx="22" ry="20" fill="#ffffff" />
          <ellipse cx="84" cy="62" rx="20" ry="17" fill="#ffffff" />
        </g>

        {/* rain when sad */}
        {sad && <Rain />}

        {/* cat ears on top of cloud */}
        <g>
          <Ear x={40} y={36} flip={false} color={earColor} />
          <Ear x={80} y={36} flip color={earColor} />
        </g>

        {/* optional unicorn horn (Phase 5 customization) */}
        {hornEnabled && <Horn />}

        {/* face */}
        <g className={styles.face}>
          {/* eyes */}
          {surprised ? (
            <>
              <circle cx="50" cy="58" r="4.5" fill="#3a3a3a" />
              <circle cx="70" cy="58" r="4.5" fill="#3a3a3a" />
            </>
          ) : sad ? (
            <>
              <SadEye cx={50} cy={58} />
              <SadEye cx={70} cy={58} />
            </>
          ) : (
            <>
              <ellipse cx="50" cy="58" rx="2.4" ry="3.4" fill="#3a3a3a" />
              <ellipse cx="70" cy="58" rx="2.4" ry="3.4" fill="#3a3a3a" />
            </>
          )}

          {/* cheeks */}
          {cheeks && (
            <>
              <circle cx="44" cy="66" r="3.5" fill="#ffafcc" opacity="0.75" />
              <circle cx="76" cy="66" r="3.5" fill="#ffafcc" opacity="0.75" />
            </>
          )}

          {/* mouth */}
          {surprised ? (
            <ellipse cx="60" cy="71" rx="2.6" ry="3" fill="#3a3a3a" />
          ) : sad ? (
            <path
              d="M54 73 q6 -4 12 0"
              stroke="#3a3a3a"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
            />
          ) : happy ? (
            <path
              d="M53 70 q7 6 14 0"
              stroke="#3a3a3a"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
            />
          ) : thinking ? (
            <path
              d="M56 72 q4 -1 8 0"
              stroke="#3a3a3a"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M55 71 q5 3 10 0"
              stroke="#3a3a3a"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* thinking puff */}
          {thinking && <ThinkingDot />}
        </g>

        {/* floating hearts when blushing */}
        {cheeks && <Hearts />}
      </svg>
    </div>
  );
}

function Ear({
  x,
  y,
  flip,
  color,
}: {
  x: number;
  y: number;
  flip: boolean;
  color: string;
}) {
  const transform = flip
    ? `translate(${x} ${y}) scale(-1 1)`
    : `translate(${x} ${y})`;
  return (
    <g transform={transform}>
      <polygon
        points="0,8 -8,0 6,0"
        fill={color}
        stroke="#e8b3c4"
        strokeWidth="0.5"
      />
      <polygon points="0,6 -5,1 4,1" fill="#fff7fa" />
    </g>
  );
}

function Horn() {
  return (
    <polygon
      points="60,28 56,18 64,18"
      fill={HORN_DEFAULT}
      stroke="#d8b85a"
      strokeWidth="0.6"
    />
  );
}

function Sparkles({ count = 5 }: { count?: number }) {
  const pts = [
    { x: 22, y: 30 },
    { x: 98, y: 38 },
    { x: 14, y: 60 },
    { x: 104, y: 64 },
    { x: 60, y: 12 },
  ].slice(0, count);
  return (
    <g fill="#ffd86b">
      {pts.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`}>
          <path d="M0 -3 L1 -1 L3 0 L1 1 L0 3 L-1 1 L-3 0 L-1 -1 Z" />
        </g>
      ))}
    </g>
  );
}

function Rain() {
  const drops = [32, 44, 56, 68, 80];
  return (
    <g fill="#9ec8f2">
      {drops.map((x, i) => (
        <ellipse
          key={i}
          cx={x}
          cy={96 + (i % 2) * 4}
          rx="1.2"
          ry="2.4"
          opacity="0.9"
        />
      ))}
    </g>
  );
}

function Hearts() {
  return (
    <g fill="#ff8fb1" opacity="0.9">
      <path d="M16 30 a2 2 0 0 1 4 0 a2 2 0 0 1 4 0 q0 3 -4 5 q-4 -2 -4 -5 Z" />
      <path d="M96 22 a1.5 1.5 0 0 1 3 0 a1.5 1.5 0 0 1 3 0 q0 2.5 -3 4 q-3 -1.5 -3 -4 Z" />
    </g>
  );
}

function ThinkingDot() {
  return <circle cx="80" cy="48" r="2.2" fill="#cfe3f8" />;
}

function SadEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(20)`}>
      <path
        d="M-3 -2 q3 3 6 0"
        stroke="#3a3a3a"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}
