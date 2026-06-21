import { useEffect, useState } from 'react';
import type { Emotion } from '@/types/db';
import styles from './CloudAvatar.module.css';

interface Props {
  emotion?: Emotion;
  size?: number;
  onAvatarClick?: () => void;
  /** Customize Cloud later (Phase 5). Defaults reflect current Phase 1 Cloud. */
  earColor?: string;
  cloudColor?: string;
  hornEnabled?: boolean;
}

const EAR_DEFAULT = '#ffd6e0';
const CLOUD_DEFAULT = '#f3f8ff';
const HORN_DEFAULT = '#ffe08a';

export default function CloudAvatar({
  emotion = 'idle',
  size = 140,
  onAvatarClick,
  earColor = EAR_DEFAULT,
  cloudColor = CLOUD_DEFAULT,
  hornEnabled = false,
}: Props) {
  const cheeks = emotion === 'blush';
  const sad = emotion === 'sad';
  const surprised = emotion === 'surprise';
  const happy = emotion === 'happy' || emotion === 'talking';
  const thinking = emotion === 'thinking';

  const interactive = typeof onAvatarClick === 'function';
  const [booping, setBooping] = useState(false);

  useEffect(() => {
    if (!booping) return;
    const t = setTimeout(() => setBooping(false), 420);
    return () => clearTimeout(t);
  }, [booping]);

  function handleClick() {
    if (!interactive) return;
    setBooping(true);
    onAvatarClick?.();
  }

  const rootClass = [
    styles.avatar,
    styles[emotion] ?? '',
    booping ? styles.boop : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClass}
      style={{
        ['--cloud-avatar-size' as string]: `${size}px`,
        ['--cloud-avatar-cursor' as string]: interactive
          ? 'pointer'
          : 'default',
      }}
      onClick={handleClick}
      role={interactive ? 'button' : undefined}
      aria-label={`Cloud feels ${emotion}`}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        {/* ambient sparkles for happy/surprise */}
        {happy && <Sparkles />}
        {surprised && (
          <>
            <Sparkles count={3} />
            <Bang />
          </>
        )}

        {/* flatter cloud platform for the cat to sit on */}
        <g className={styles.cloudBody}>
          {/* main flat cloud base */}
          <ellipse
            cx="60"
            cy="86"
            rx="50"
            ry="14"
            fill={cloudColor}
            stroke="#d8e6f7"
            strokeWidth="1"
          />
          {/* left bump */}
          <ellipse
            cx="28"
            cy="80"
            rx="14"
            ry="11"
            fill={cloudColor}
            stroke="#d8e6f7"
            strokeWidth="1"
          />
          {/* center-left bump */}
          <ellipse
            cx="48"
            cy="76"
            rx="16"
            ry="12"
            fill={cloudColor}
            stroke="#d8e6f7"
            strokeWidth="1"
          />
          {/* center-right bump */}
          <ellipse
            cx="72"
            cy="76"
            rx="16"
            ry="12"
            fill={cloudColor}
            stroke="#d8e6f7"
            strokeWidth="1"
          />
          {/* right bump */}
          <ellipse
            cx="92"
            cy="80"
            rx="14"
            ry="11"
            fill={cloudColor}
            stroke="#d8e6f7"
            strokeWidth="1"
          />
        </g>

        {/* rain when sad — falls from the cloud */}
        {sad && <Rain />}

        {/* cat lounging on the cloud */}
        <g className={styles.catBody}>
          {/* tail curling around the right side */}
          <path
            d="M88 72 q14 -2 12 -14 q-2 -8 -10 -6"
            fill="none"
            stroke={earColor}
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* cat body — lounging oval resting on cloud */}
          <ellipse
            cx="56"
            cy="68"
            rx="26"
            ry="14"
            fill={earColor}
            stroke="#e8b3c4"
            strokeWidth="0.6"
          />

          {/* cat head — sitting up from the body */}
          <ellipse
            cx="56"
            cy="48"
            rx="16"
            ry="15"
            fill={earColor}
            stroke="#e8b3c4"
            strokeWidth="0.6"
          />

          {/* cat ears on head */}
          <Ear x={44} y={36} flip={false} color={earColor} />
          <Ear x={68} y={36} flip color={earColor} />

          {/* optional unicorn horn (Phase 5 customization) */}
          {hornEnabled && <Horn />}

          {/* front paws resting on cloud edge */}
          <ellipse cx="44" cy="80" rx="4" ry="3" fill={earColor} stroke="#e8b3c4" strokeWidth="0.4" />
          <ellipse cx="66" cy="80" rx="4" ry="3" fill={earColor} stroke="#e8b3c4" strokeWidth="0.4" />
        </g>

        {/* face */}
        <g className={styles.face}>
          {/* eyes */}
          {surprised ? (
            <>
              <circle cx="49" cy="48" r="4" fill="#3a3a3a" />
              <circle cx="63" cy="48" r="4" fill="#3a3a3a" />
            </>
          ) : sad ? (
            <>
              <SadEye cx={49} cy={48} />
              <SadEye cx={63} cy={48} />
            </>
          ) : (
            <>
              <ellipse cx="49" cy="48" rx="2.2" ry="3.2" fill="#3a3a3a" />
              <ellipse cx="63" cy="48" rx="2.2" ry="3.2" fill="#3a3a3a" />
            </>
          )}

          {/* cheeks */}
          {cheeks && (
            <>
              <circle cx="43" cy="55" r="3" fill="#ffafcc" opacity="0.75" />
              <circle cx="69" cy="55" r="3" fill="#ffafcc" opacity="0.75" />
            </>
          )}

          {/* nose */}
          <path
            d="M54 54 l4 0 l-2 2 Z"
            fill="#e8829e"
          />

          {/* mouth */}
          {surprised ? (
            <ellipse cx="56" cy="60" rx="1.8" ry="2.2" fill="#3a3a3a" />
          ) : sad ? (
            <path
              d="M51 61 q5 -3 10 0"
              stroke="#3a3a3a"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
            />
          ) : happy ? (
            <path
              d="M50 59 q6 5 12 0"
              stroke="#3a3a3a"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
            />
          ) : thinking ? (
            <path
              d="M53 61 q3 -1 6 0"
              stroke="#3a3a3a"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M52 60 q4 2 8 0"
              stroke="#3a3a3a"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* whiskers */}
          <g stroke="#c9a0ad" strokeWidth="0.5" opacity="0.6" strokeLinecap="round">
            <line x1="38" y1="54" x2="30" y2="52" />
            <line x1="38" y1="56" x2="30" y2="57" />
            <line x1="74" y1="54" x2="82" y2="52" />
            <line x1="74" y1="56" x2="82" y2="57" />
          </g>

          {/* thinking orbit puff */}
          {thinking && (
            <circle
              className={styles.thinkingDot}
              cx="56"
              cy="46"
              r="2.2"
              fill="#cfe3f8"
            />
          )}
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
        points="0,8 -7,0 6,0"
        fill={color}
        stroke="#e8b3c4"
        strokeWidth="0.5"
      />
      <polygon points="0,6 -4,1 4,1" fill="#fff7fa" />
    </g>
  );
}

function Horn() {
  return (
    <polygon
      points="56,28 52,18 60,18"
      fill={HORN_DEFAULT}
      stroke="#d8b85a"
      strokeWidth="0.6"
    />
  );
}

function Sparkles({ count = 5 }: { count?: number }) {
  const pts = [
    { x: 18, y: 22 },
    { x: 100, y: 30 },
    { x: 10, y: 50 },
    { x: 108, y: 54 },
    { x: 60, y: 8 },
  ].slice(0, count);
  return (
    <g fill="#ffd86b">
      {pts.map((p, i) => (
        <g
          key={i}
          className={styles.sparkle}
          transform={`translate(${p.x} ${p.y})`}
        >
          <path d="M0 -3 L1 -1 L3 0 L1 1 L0 3 L-1 1 L-3 0 L-1 -1 Z" />
        </g>
      ))}
    </g>
  );
}

function Rain() {
  const drops = [28, 42, 56, 70, 84];
  return (
    <g fill="#9ec8f2">
      {drops.map((x, i) => (
        <ellipse
          key={i}
          className={styles.raindrop}
          cx={x}
          cy={100 + (i % 2) * 4}
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
      <path
        className={styles.heart}
        d="M14 24 a2 2 0 0 1 4 0 a2 2 0 0 1 4 0 q0 3 -4 5 q-4 -2 -4 -5 Z"
      />
      <path
        className={styles.heart}
        d="M96 16 a1.5 1.5 0 0 1 3 0 a1.5 1.5 0 0 1 3 0 q0 2.5 -3 4 q-3 -1.5 -3 -4 Z"
      />
      <path
        className={styles.heart}
        d="M48 12 a1 1 0 0 1 2 0 a1 1 0 0 1 2 0 q0 1.8 -2 3 q-2 -1.2 -2 -3 Z"
      />
    </g>
  );
}

function Bang() {
  return (
    <g className={styles.bang} transform="translate(56 8)">
      <circle cx="0" cy="0" r="6" fill="#ffd86b" />
      <text
        x="0"
        y="3"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="#7a5b00"
      >
        !
      </text>
    </g>
  );
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