import React from 'react'
import { BaseEdge, EdgeLabelRenderer, EdgeProps } from '@xyflow/react'
import { motion } from 'framer-motion'

function pathFrom(points: Array<[number, number]>) {
  if (!points.length) return ''
  const [startX, startY] = points[0]
  let d = `M ${startX},${startY}`
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i]
    d += ` L ${x},${y}`
  }
  return d
}

export default function BusEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style,
    label,
    markerEnd,
  } = props

  const offsetY = 30
  const busX = 250
  const y1 = sourceY + offsetY
  const y2 = targetY - offsetY

  const d = pathFrom([
    [sourceX, sourceY],
    [sourceX, y1],
    [busX, y1],
    [busX, y2],
    [targetX, y2],
    [targetX, targetY],
  ])

  const edgeColor = style?.stroke || '#6366f1'

  return (
    <>
      {/* Ambient Energy Glow */}
      {!props.data?.isPrintMode && (
        <path
          d={d}
          fill="none"
          stroke={edgeColor}
          strokeWidth={5}
          className="opacity-10 blur-[6px]"
          style={{ filter: 'url(#electric-distortion)' }}
        />
      )}
      <BaseEdge
        id={id}
        path={d}
        fill="none"
        style={{
          ...style,
          strokeWidth: 2.5,
          filter: props.data?.isPrintMode ? 'none' : `drop-shadow(0 0 4px ${edgeColor}44)`
        }}
        markerEnd={markerEnd}
      />

      {/* --- COMET PACKET ANIMATION --- */}
      {!props.data?.isPrintMode && (
        <g style={{ filter: 'url(#comet-glow)' }}>
          <motion.g
            initial={{ ["--comet-offset" as any]: "0%" }}
            animate={{ ["--comet-offset" as any]: "100%" }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5
            }}
            style={{
              offsetPath: `path("${d}")`,
              offsetDistance: "var(--comet-offset)",
            } as any}
          >
            {/* Trail */}
            <rect
              x="-30"
              y="-1.5"
              width="30"
              height="3"
              fill="url(#comet-trail-default)"
              rx="1.5"
            />
            {/* Glowing Head */}
            <circle
              r="2.5"
              fill="white"
              className="shadow-[0_0_10px_white]"
            />
          </motion.g>
        </g>
      )}

      {label ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${busX}px, ${(y1 + y2) / 2}px)`,
              pointerEvents: 'none',
            }}
            className="px-3 py-1 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-lg shadow-xl"
          >
            <div className="text-[10px] font-black text-white uppercase tracking-widest">
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}
