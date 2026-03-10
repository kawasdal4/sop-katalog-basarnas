"use client"

import React, { useCallback, useMemo, useRef, useState, useEffect, memo } from 'react';
import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    addEdge,
    reconnectEdge,
    Panel,
    Position,
    ReactFlowProvider,
    MarkerType,
    useReactFlow,
    getSmoothStepPath,
    Handle,
    Controls,
    Background,
    BackgroundVariant,
    ControlButton,
    ConnectionMode,
    MiniMap
} from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import '@xyflow/react/dist/style.css';
import SopFlowchartNode from './SopFlowchartNode';
import { Button } from '@/components/ui/button';
import {
    Download, Loader2, FileCheck, Save, RotateCcw, ArrowLeft,
    ZoomIn, ZoomOut, RefreshCw
} from 'lucide-react';
import { toPng, toJpeg } from 'html-to-image';
import { toast } from 'sonner';

// --- CUSTOM NODES ---

const HeaderNode = ({ data }: any) => {
    const isPrintMode = data?.isPrintMode;

    if (isPrintMode) {
        return (
            <div
                style={{ width: data.width, height: data.height || 50 }}
                className={`flex items-center justify-center border-r border-b border-black p-2 bg-white`}
            >
                <span className={`text-black uppercase text-center font-black tracking-tight leading-[1.1] break-words ${data.isGroup ? 'text-[13px]' : 'text-[10px]'}`}>
                    {data.label}
                </span>
            </div>
        );
    }

    return (
        <div
            style={{ width: data.width, height: data.height || 50 }}
            className={`flex items-center justify-center border-r border-b border-white/5 p-2 relative overflow-hidden bg-slate-900/40 backdrop-blur-3xl group`}
        >
            {/* Energy Accent Line */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500/50 via-indigo-500/50 to-orange-500/50 animate-pulse" />

            {/* Grid Coordinates (Corner Accents) */}
            <div className="absolute top-1 left-1 w-1 h-1 border-t border-l border-white/20" />
            <div className="absolute bottom-1 right-1 w-1 h-1 border-b border-r border-white/20" />

            <span className={`text-white uppercase text-center font-black tracking-[0.2em] leading-[1.1] break-words transition-all group-hover:scale-105 ${data.isGroup ? 'text-[11px] opacity-100' : 'text-[9px] opacity-60 group-hover:opacity-100'}`}>
                {data.label}
            </span>

            {/* Glass Glare */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};

const InfoNode = ({ data }: any) => {
    const isPrintMode = data?.isPrintMode;

    if (isPrintMode) {
        return (
            <div
                style={{ width: data.width, height: data.height || 100 }}
                className="flex flex-col border-r border-b border-black p-4 bg-white justify-center"
            >
                {data.type === 'no' && (
                    <div className="h-full flex items-center justify-center font-black text-black text-xl">{data.value}</div>
                )}
                {data.type === 'aktivitas' && (
                    <div className="text-[12px] text-black leading-normal font-bold break-words">{data.value}</div>
                )}
                {data.type === 'keterangan' && (
                    <div className="text-[10px] text-black italic leading-snug break-words">{data.value || '-'}</div>
                )}
            </div>
        );
    }

    return (
        <div
            style={{ width: data.width, height: data.height || 100 }}
            className={`flex flex-col border-r border-b border-white/5 p-4 bg-white/[0.02] backdrop-blur-[2px] overflow-hidden justify-center relative transition-all hover:bg-white/[0.05] group selection:bg-indigo-500/30`}
        >
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-1 h-1 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />

            {data.type === 'no' && (
                <div className="h-full flex items-center justify-center font-black text-slate-600 group-hover:text-indigo-400/60 text-3xl tracking-tighter transition-all duration-500 group-hover:scale-110">
                    {data.value}
                </div>
            )}
            {data.type === 'aktivitas' && (
                <div
                    className="text-[12px] text-slate-300 leading-relaxed text-left font-medium break-words overflow-hidden transition-colors group-hover:text-white"
                >
                    {data.value}
                </div>
            )}
            {data.type === 'keterangan' && (
                <div className="text-[10px] text-slate-500 italic font-medium leading-snug text-left break-words overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity">
                    {data.value || '-'}
                </div>
            )}

            {/* Scanning Laser Line (Subtle) */}
            <div className="absolute left-0 w-[1px] h-full bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};

const GapColumnNode = ({ data }: any) => {
    const isPrintMode = data?.isPrintMode;
    return (
        <div
            style={{ width: data.width, height: data.height || 60 }}
            className={isPrintMode ? "bg-transparent" : "bg-transparent border-r border-white/5"}
        />
    );
};

const WaypointNode = ({ selected, data }: any) => (
    <motion.div
        animate={{ scale: selected ? 1.2 : 1 }}
        className={`w-3 h-3 rounded-full border-2 bg-white flex items-center justify-center transition-all ${selected ? 'border-indigo-600 shadow-lg' : 'border-slate-300 shadow-sm opacity-80'}`}
        style={{
            cursor: 'move',
        }}
    >
        <div className={`w-1 h-1 rounded-full ${selected ? 'bg-indigo-600' : 'bg-slate-400'}`} />
    </motion.div>
);

const OffPageConnector = ({ data }: any) => {
    const isPrintMode = data?.isPrintMode;
    const strokeColor = isPrintMode ? "#000000" : "#64748b";
    const isUp = data?.direction === 'up';
    const connectorSize = 72;

    return (
        <div className="flex flex-col items-center justify-center relative" style={{ width: connectorSize, height: connectorSize }}>
            {/* Standard Handles */}
            <Handle type="target" position={isUp ? Position.Bottom : Position.Top} id={isUp ? "bottom" : "top"} className="!opacity-0" />
            <Handle type="source" position={isUp ? Position.Top : Position.Bottom} id={isUp ? "top" : "bottom"} className="!opacity-0" />

            <svg
                width={connectorSize}
                height={connectorSize}
                viewBox="-2 -2 104 104"
                preserveAspectRatio="none"
                className={isPrintMode ? "" : "drop-shadow-md"}
                style={{ transform: isUp ? 'rotate(180deg)' : 'none' }}
            >
                <path
                    d="M 12 2 L 88 2 L 98 64 L 50 98 L 2 64 Z"
                    fill="white"
                    stroke={strokeColor}
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center font-black ${isPrintMode ? 'text-black' : 'text-slate-800'} text-xl ${isUp ? 'pt-1' : 'pb-1'} uppercase tracking-tighter select-none`}>
                {data.label}
            </div>
        </div>
    )
};

const nodeTypes = {
    sopNode: SopFlowchartNode,
    headerNode: memo(HeaderNode),
    infoNode: memo(InfoNode),
    gapColumnNode: memo(GapColumnNode),
    waypointNode: memo(WaypointNode),
    offPageConnector: memo(OffPageConnector),
};

// --- ENERGY BEAM FILTERS ---
const EnergyBeamFilters = () => (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
            <filter id="electric-distortion" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.05 0.5" numOctaves="2" seed="5" result="noise">
                    <animate attributeName="seed" from="1" to="100" dur="10s" repeatCount="indefinity" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id="comet-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="comet-trail-ya" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="comet-trail-tidak" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="comet-trail-default" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />
            </linearGradient>
        </defs>
    </svg>
);

// --- CUSTOM EDGES ---
const SopEdge = ({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
    selected,
    markerEnd,
    label
}: any) => {
    const isTidak = String(label || '').includes('Tidak');
    const isYa = String(label || '').includes('Ya');
    const isCoordination = data?.isCoordination;

    const obstacles = data?.obstacles || [];

    // Point 8: Cari Jalur Kosong Otomatis (Retry logic)
    const tryPath = (offsetValue: number) => {
        const [path, labelX, labelY] = getSmoothStepPath({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
            borderRadius: 15,
            offset: offsetValue
        });

        // Simple check: does the horizontal/vertical segment hit any obstacle?
        // For SopEdge, we'll check if path hits any node in obstacles
        const isBlocked = obstacles.some((node: any) => {
            if (node.id === source || node.id === target) return false;
            const rect = { x: node.position.x, y: node.position.y, width: node.width, height: node.height };

            // Check if source or target point of path segments hit rect
            // This is a rough approximation for performance
            const pathPoints = [
                { x: sourceX, y: sourceY },
                { x: targetX, y: targetY }
            ];
            return intersects(pathPoints[0], pathPoints[1], rect);
        });

        return { path, labelX, labelY, isBlocked };
    };

    // Attempt candidates (Rule 8)
    const baseOffset = isTidak ? 45 : 25;
    const candidates = [
        baseOffset,         // 1. Straight
        baseOffset + 80,    // 2. Right (more offset)
        baseOffset - 80,    // 3. Left (less offset)
        baseOffset + 150    // 4. Bottom (maximum detour)
    ];

    let bestPath = tryPath(candidates[0]);
    if (bestPath.isBlocked) {
        for (let i = 1; i < candidates.length; i++) {
            const nextTry = tryPath(candidates[i]);
            if (!nextTry.isBlocked) {
                bestPath = nextTry;
                break;
            }
        }
    }

    const d = bestPath.path;
    let labelX = bestPath.labelX;
    let labelY = bestPath.labelY;

    if (isTidak) {
        if (sourcePosition === Position.Right) {
            labelX = sourceX + 40;
            labelY = sourceY;
        } else if (sourcePosition === Position.Left) {
            labelX = sourceX - 40;
            labelY = sourceY;
        }
    } else if (isYa) {
        labelX = sourceX;
        labelY = sourceY + 30;
    }

    const YA_COLOR = '#10b981';
    const TIDAK_COLOR = '#f43f5e';
    const DEFAULT_COLOR = '#6366f1';

    const edgeColor = selected ? '#ffffff' : (isYa ? YA_COLOR : isTidak ? TIDAK_COLOR : (style.stroke || DEFAULT_COLOR));
    const trailId = isYa ? 'comet-trail-ya' : isTidak ? 'comet-trail-tidak' : 'comet-trail-default';

    return (
        <>
            <path
                className="react-flow__edge-interaction"
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={35}
                style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
            />

            {/* Ambient Energy Glow */}
            {!data?.isPrintMode && (
                <path
                    d={d}
                    fill="none"
                    stroke={edgeColor}
                    strokeWidth={selected ? 10 : 5}
                    className="opacity-10 blur-[6px]"
                    style={{ filter: 'url(#electric-distortion)' }}
                />
            )}

            {/* Core Energy Beam */}
            <path
                id={id}
                fill="none"
                style={{
                    ...style,
                    stroke: edgeColor,
                    strokeWidth: selected ? 3.5 : 2.5,
                    strokeDasharray: isCoordination ? '10 8' : '0',
                    transition: 'stroke 0.4s, stroke-width 0.4s',
                    filter: data?.isPrintMode ? 'none' : (selected ? `drop-shadow(0 0 15px ${edgeColor})` : `drop-shadow(0 0 4px ${edgeColor}44)`)
                }}
                className="react-flow__edge-path"
                d={d}
                markerEnd={markerEnd}
            />

            {/* --- COMET PACKET ANIMATION --- */}
            {!data?.isPrintMode && (
                <g style={{ filter: 'url(#comet-glow)' }}>
                    <motion.g
                        initial={{ ["--comet-offset" as any]: "0%" }}
                        animate={{ ["--comet-offset" as any]: "100%" }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "linear",
                            delay: Math.random() * 4
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
                            fill={`url(#${trailId})`}
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

            {label && (
                <g transform={`translate(${labelX}, ${labelY})`}>
                    {data?.isPrintMode ? (
                        /* Simple High-Contrast Label for Print */
                        <g>
                            <rect
                                x={-24}
                                y={-12}
                                width={48}
                                height="24"
                                rx="4"
                                fill="white"
                                stroke={edgeColor}
                                strokeWidth="2"
                            />
                            <text
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="#0f172a"
                                style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }}
                            >
                                {isYa ? 'YA' : 'TIDAK'}
                            </text>
                        </g>
                    ) : (
                        <motion.g
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            {/* HUD Diagnostic Box */}
                            <rect
                                x={-28}
                                y={-14}
                                width={56}
                                height="28"
                                rx="6"
                                fill="rgba(2, 6, 23, 0.9)"
                                stroke={edgeColor}
                                strokeWidth="1.5"
                                className="backdrop-blur-2xl shadow-2xl"
                            />
                            {/* Scanning HUD Line */}
                            <motion.line
                                x1="-24"
                                y1="-10"
                                x2="-24"
                                y2="10"
                                stroke={edgeColor}
                                strokeWidth="1"
                                strokeOpacity="0.5"
                                animate={{ x: [-24, 24, -24] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            />
                            <text
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="white"
                                style={{ fontSize: '10px', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.15em' }}
                            >
                                {isYa ? 'YA' : 'TIDAK'}
                            </text>
                            {/* Corner Accents */}
                            <path d="M -28 -8 V -14 H -22" fill="none" stroke={edgeColor} strokeWidth="1" strokeOpacity="0.8" />
                            <path d="M 22 14 H 28 V 8" fill="none" stroke={edgeColor} strokeWidth="1" strokeOpacity="0.8" />
                        </motion.g>
                    )}
                </g>
            )}
            {selected && !data?.isPrintMode && (
                <foreignObject
                    width={24}
                    height={24}
                    x={labelX - 12}
                    y={labelY - 38}
                    style={{ overflow: 'visible' }}
                >
                    <div className="flex items-center justify-center h-full">
                        {data?.onResetWaypoint && (
                            <button
                                className="w-7 h-7 bg-rose-600/90 backdrop-blur-md text-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:scale-125 transition-all cursor-pointer border border-white/20 active:scale-90"
                                style={{ pointerEvents: 'auto' }}
                                title="Deconstruct Matrix Path"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (data?.onResetWaypoint) data.onResetWaypoint(id);
                                }}
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </foreignObject>
            )}
        </>
    );
};

const edgeTypes = {
    sopEdge: memo(SopEdge),
};

// --- LAYOUT CONSTANTS ---
const COL_NO_WIDTH = 50;
const COL_KEGIATAN_WIDTH = 280;
const PELAKSANA_WIDTH = 120;
const TRACK_WIDTH = 0;
const LANE_WIDTH = PELAKSANA_WIDTH + TRACK_WIDTH;
const COL_MUTU_WIDTH = 135;
const COL_KETERANGAN_WIDTH = 190;
const HEADER_GROUP_HEIGHT = 35;
const HEADER_SUB_HEIGHT = 45;
const TOTAL_HEADER_HEIGHT = HEADER_GROUP_HEIGHT + HEADER_SUB_HEIGHT;

// --- PAGINATION CONSTANTS ---
const PAGE_HEIGHT = 900;
const TOP_MARGIN = 80;
const BOTTOM_MARGIN = 80;
const USABLE_HEIGHT = PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN;
const VERTICAL_GAP = 60;
const BASE_NODE_HEIGHT = 60;
const CHARS_PER_LINE = 40;
const LINE_HEIGHT = 20;
const PAGE_GAP = 120;

const getPage = (y: number) => Math.floor(y / (PAGE_HEIGHT + PAGE_GAP));

const calculateNodeHeight = (text: string) => {
    if (!text) return BASE_NODE_HEIGHT;
    const lines = Math.ceil(text.length / CHARS_PER_LINE);
    return BASE_NODE_HEIGHT + (lines * LINE_HEIGHT);
};

// --- UTILS ---
const smartParse = (val: any, fallback: any) => {
    if (!val) return fallback;
    try {
        let parsed = typeof val === 'string' ? JSON.parse(val) : val;
        if (typeof parsed === 'string') {
            try {
                const secondParse = JSON.parse(parsed);
                if (secondParse) parsed = secondParse;
            } catch (e) { }
        }
        return parsed || fallback;
    } catch (e) {
        return fallback;
    }
};

const intersects = (p1: any, p2: any, rect: any) => {
    // Simple line-rectangle intersection check
    const { x: rx, y: ry, width: rw, height: rh } = rect;

    // Check if either end is inside
    const isInside = (px: number, py: number) => px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    if (isInside(p1.x, p1.y) || isInside(p2.x, p2.y)) return true;

    // Check intersection with all 4 sides
    const lineIntersectsLine = (a: any, b: any, c: any, d: any) => {
        let det = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
        if (det === 0) return false;
        let lambda = ((d.y - c.y) * (d.x - a.x) + (c.x - d.x) * (d.y - a.y)) / det;
        let gamma = ((a.y - b.y) * (d.x - a.x) + (b.x - a.x) * (d.y - a.y)) / det;
        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    };

    return lineIntersectsLine(p1, p2, { x: rx, y: ry }, { x: rx + rw, y: ry }) || // Top
        lineIntersectsLine(p1, p2, { x: rx + rw, y: ry }, { x: rx + rw, y: ry + rh }) || // Right
        lineIntersectsLine(p1, p2, { x: rx + rw, y: ry + rh }, { x: rx, y: ry + rh }) || // Bottom
        lineIntersectsLine(p1, p2, { x: rx, y: ry + rh }, { x: rx, y: ry }) // Left
};

const isPathBlocked = (source: any, target: any, nodes: any[]) => {
    return nodes.some(node => {
        // Skip source and target nodes themselves
        if (node.id === source.id || node.id === target.id) return false;

        // Define bounding box
        const w = node.measured?.width || (node.data?.width ?? 120);
        const h = node.measured?.height || (node.data?.height ?? 60);
        const rect = { x: node.position.x, y: node.position.y, width: w, height: h };

        return intersects(source.position, target.position, rect);
    });
};

const ExportLoadingOverlay = ({ isVisible }: { isVisible: boolean }) => {
    const labels = [
        "Initializing Tactical Render...",
        "Optimizing Flow Geometry...",
        "Syncing Neural Path Matrix...",
        "Compiling PDF Data Structures...",
        "Finalizing Document Fidelity...",
        "Transmitting to Satellite Uplink..."
    ];

    const [labelIndex, setLabelIndex] = React.useState(0);

    React.useEffect(() => {
        if (!isVisible) return;
        const interval = setInterval(() => {
            setLabelIndex((prev) => (prev + 1) % labels.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [isVisible]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md overflow-hidden"
                >
                    {/* Background Energy Vortex */}
                    <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[80px]" />
                    </div>

                    <div className="relative z-10 flex flex-col items-center">
                        {/* Orbital Loader Complex */}
                        <div className="relative w-40 h-40 mb-12">
                            {/* Inner Pulsing Core */}
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-8 rounded-3xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                            >
                                <Download className="w-8 h-8 text-indigo-400" />
                            </motion.div>

                            {/* Rotating Ring 1 */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border-t-2 border-r-2 border-indigo-500/30 rounded-full"
                            />

                            {/* Rotating Ring 2 */}
                            <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-2 border-b-2 border-l-2 border-orange-500/20 rounded-full"
                            />

                            {/* Rotating Ring 3 */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-4 border-t border-white/10 border-dashed rounded-full"
                            />

                            {/* Energy Particles */}
                            {[...Array(8)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-1.5 h-1.5 bg-indigo-400 rounded-full"
                                    animate={{
                                        rotate: 360,
                                        opacity: [0, 1, 0],
                                        scale: [0.5, 1, 0.5]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        delay: i * 0.25,
                                        ease: "linear"
                                    }}
                                    style={{
                                        top: '50%',
                                        left: '50%',
                                        transformOrigin: `${70 + Math.random() * 10}px center`,
                                    }}
                                />
                            ))}
                        </div>

                        {/* Static Text Core */}
                        <div className="text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center"
                            >
                                <div className="text-slate-500 font-black text-[10px] uppercase tracking-[0.6em] mb-3">System Processing</div>
                                <h3 className="text-white font-black text-2xl mb-4 tracking-tighter uppercase">Exporting PDF</h3>

                                {/* Dynamic Status Labels */}
                                <div className="h-6 flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={labelIndex}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="text-indigo-400 text-[11px] font-bold uppercase tracking-widest bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20"
                                        >
                                            {labels[labelIndex]}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Progress Bar Accent (Simulated) */}
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <motion.div
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="w-1/3 h-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

interface SopFlowchartProps {
    sopData: any;
    onExportFinal?: (imageBase64: string | null) => void;
    isExporting?: boolean;
    isPrintMode?: boolean;
    onRefresh?: () => void;
    onGenerateCover?: () => void;
    isGeneratingCover?: boolean;
    onBack?: React.MouseEventHandler<HTMLButtonElement>;
    onDataUpdate?: (newData: any) => void;
}

const FlowchartCore = ({ sopData, onExportFinal, isExporting, isPrintMode = false, onRefresh, onGenerateCover, isGeneratingCover, onBack, onDataUpdate }: SopFlowchartProps) => {
    const { zoomIn, zoomOut, fitView, setViewport, getViewport } = useReactFlow();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [isManualMode, setIsManualMode] = useState(false);
    const [isSavingPaths, setIsSavingPaths] = useState(false);
    const [isExportingState, setIsExportingState] = useState(false);
    const [readyPagesCount, setReadyPagesCount] = useState(0);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isCaptureMode, setIsCaptureMode] = useState(false);

    const effectivePrintMode = isPrintMode || isCaptureMode;

    const { pagesData, allNodes, allEdges } = useMemo(() => {
        try {
            const steps = Array.isArray(sopData?.langkahLangkah) ? sopData.langkahLangkah : [];
            console.log(`[SopFlowchart] Processing ${steps.length} steps`);

            // Check for lanes in 'pelaksana' (from ImportSopPage) or 'pelaksanaLanes' (from DB)
            let rawLanes = sopData?.pelaksana || sopData?.pelaksanaLanes;
            let lanes = smartParse(rawLanes, ['Pelaksana']);

            if (!Array.isArray(lanes)) lanes = ['Pelaksana'];
            if (lanes.length === 0) lanes = ['Pelaksana'];

            const flowchartWidth = COL_NO_WIDTH + COL_KEGIATAN_WIDTH + (lanes.length * LANE_WIDTH) + (3 * COL_MUTU_WIDTH) + COL_KETERANGAN_WIDTH;

            let currentPageNodes: any[] = [];
            let currentY = TOP_MARGIN;
            let pageIndex = 0;
            let offPageLabelIndex = 0;

            const pages: any[] = [];

            const renderHeaders = (idx: number, nodesList: any[]) => {
                const startY = 0;
                let hdrX = 0;
                nodesList.push({
                    id: `h-no-${idx}`, type: 'headerNode', position: { x: hdrX, y: startY },
                    data: { label: 'No', width: COL_NO_WIDTH, height: TOTAL_HEADER_HEIGHT, isPrintMode: effectivePrintMode },
                    draggable: false, zIndex: 100,
                });
                hdrX += COL_NO_WIDTH;
                nodesList.push({
                    id: `h-kegiatan-${idx}`, type: 'headerNode', position: { x: hdrX, y: startY },
                    data: { label: 'Kegiatan', width: COL_KEGIATAN_WIDTH, height: TOTAL_HEADER_HEIGHT, isPrintMode: effectivePrintMode },
                    draggable: false, zIndex: 100,
                });
                hdrX += COL_KEGIATAN_WIDTH;
                nodesList.push({
                    id: `h-group-pelaksana-${idx}`, type: 'headerNode', position: { x: hdrX, y: startY },
                    data: { label: 'Pelaksana (Flow Proses)', width: lanes.length * LANE_WIDTH, height: HEADER_GROUP_HEIGHT, isGroup: true, isPrintMode: effectivePrintMode },
                    draggable: false, zIndex: 100,
                });
                lanes.forEach((lane: string, i: number) => {
                    nodesList.push({
                        id: `h-lane-${idx}-${i}`, type: 'headerNode', position: { x: hdrX + (i * LANE_WIDTH), y: startY + HEADER_GROUP_HEIGHT },
                        data: { label: lane, width: LANE_WIDTH, height: HEADER_SUB_HEIGHT, isPrintMode: effectivePrintMode },
                        draggable: false, zIndex: 100,
                    });
                });
                hdrX += (lanes.length * LANE_WIDTH);
                const MUTU_WIDTHS = [120, 80, 100]; // Kelengkapan, Waktu, Output
                nodesList.push({
                    id: `h-group-mutubaku-${idx}`, type: 'headerNode', position: { x: hdrX, y: startY },
                    data: { label: 'Mutu Baku', width: MUTU_WIDTHS.reduce((a, b) => a + b, 0), height: HEADER_GROUP_HEIGHT, isGroup: true, isPrintMode: effectivePrintMode },
                    draggable: false, zIndex: 100,
                });

                let currentMutuX = hdrX;
                ['Kelengkapan', 'Waktu', 'Output'].forEach((label, i) => {
                    nodesList.push({
                        id: `h-mutu-${idx}-${label}`, type: 'headerNode', position: { x: currentMutuX, y: startY + HEADER_GROUP_HEIGHT },
                        data: { label, width: MUTU_WIDTHS[i], height: HEADER_SUB_HEIGHT, isPrintMode: effectivePrintMode },
                        draggable: false, zIndex: 100,
                    });
                    currentMutuX += MUTU_WIDTHS[i];
                });
                hdrX = currentMutuX;

                nodesList.push({
                    id: `h-keterangan-${idx}`, type: 'headerNode', position: { x: hdrX, y: startY },
                    data: { label: 'Keterangan', width: COL_KETERANGAN_WIDTH, height: TOTAL_HEADER_HEIGHT, isPrintMode: effectivePrintMode },
                    draggable: false, zIndex: 100,
                });

                // Gap Columns based on actual widths
                let gapX = COL_NO_WIDTH + COL_KEGIATAN_WIDTH;
                for (let i = 0; i < lanes.length; i++) {
                    nodesList.push({
                        id: `gap-${idx}-${i}`, type: 'gapColumnNode', position: { x: gapX + (i * LANE_WIDTH) + LANE_WIDTH, y: startY + TOTAL_HEADER_HEIGHT },
                        data: { width: 0, height: PAGE_HEIGHT - TOTAL_HEADER_HEIGHT, isPrintMode: effectivePrintMode },
                        draggable: false, zIndex: -1,
                    });
                }
            };

            renderHeaders(pageIndex, currentPageNodes);

            steps.forEach((step: any, index: number) => {
                const nodeHeight = calculateNodeHeight(step.aktivitas);

                if (currentY + nodeHeight > USABLE_HEIGHT) {
                    const offPageLabel = String.fromCharCode(65 + offPageLabelIndex);

                    // Add Bottom Connector
                    currentPageNodes.push({
                        id: `off-page-out-${pageIndex}`,
                        type: 'offPageConnector',
                        position: { x: (flowchartWidth / 2) - 30, y: USABLE_HEIGHT - 20 },
                        data: { label: offPageLabel, connectorType: 'page-break-bottom', isPrintMode: effectivePrintMode },
                        draggable: false, zIndex: 20
                    });

                    pages.push({ index: pageIndex, nodes: [...currentPageNodes] });

                    // Setup Next Page
                    pageIndex++;
                    offPageLabelIndex++;
                    currentPageNodes = [];
                    currentY = TOP_MARGIN;

                    renderHeaders(pageIndex, currentPageNodes);

                    // Add Top Connector
                    currentPageNodes.push({
                        id: `off-page-in-${pageIndex}`,
                        type: 'offPageConnector',
                        position: { x: (flowchartWidth / 2) - 30, y: TOP_MARGIN },
                        data: { label: offPageLabel, connectorType: 'page-break-top', isPrintMode: effectivePrintMode },
                        draggable: false, zIndex: 20
                    });
                    currentY += 80;
                }

                let rowX = 0;
                currentPageNodes.push({
                    id: `row-no-${index}`, type: 'infoNode', position: { x: rowX, y: currentY },
                    data: { type: 'no', value: step.order || index + 1, width: COL_NO_WIDTH, height: nodeHeight, isPrintMode: effectivePrintMode },
                    draggable: false, zIndex: 1,
                });
                rowX += COL_NO_WIDTH;
                currentPageNodes.push({
                    id: `row-keg-${index}`, type: 'infoNode', position: { x: rowX, y: currentY },
                    data: { type: 'aktivitas', value: step.aktivitas, width: COL_KEGIATAN_WIDTH, height: nodeHeight, isPrintMode: effectivePrintMode },
                    draggable: false, zIndex: 1,
                });
                rowX += COL_KEGIATAN_WIDTH;

                // Find lane index with case-insensitive match
                let laneIndex = lanes.findIndex((l: string) =>
                    l.trim().toLowerCase() === (step.pelaksana || '').trim().toLowerCase()
                );
                if (laneIndex === -1) laneIndex = 0; // Default to first lane if not found

                const nodeX = rowX + (laneIndex * LANE_WIDTH) + (PELAKSANA_WIDTH / 2) - 40;

                // Use a stable ID based on order to ensure connectors persist across saves/refreshes
                const nodeStableId = `flow-node-${step.order || index + 1}`;

                currentPageNodes.push({
                    id: nodeStableId,
                    type: 'sopNode',
                    position: { x: nodeX, y: currentY + (nodeHeight / 2) - 22.5 },
                    data: {
                        no: step.order || index + 1,
                        aktivitas: step.aktivitas,
                        stepType: step.stepType || 'process',
                        pelaksana: step.pelaksana,
                        nextStepYes: step.nextStepYes,
                        nextStepNo: step.nextStepNo,
                        pageIndex: pageIndex,
                        dbId: step.id,
                        isPrintMode: effectivePrintMode,
                    },
                    draggable: false, zIndex: 10,
                });

                lanes.forEach((_: any, i: number) => {
                    currentPageNodes.push({
                        id: `bg-lane-${index}-${i}`, type: 'infoNode', position: { x: rowX + (i * LANE_WIDTH), y: currentY },
                        data: { type: 'bg', width: LANE_WIDTH, height: nodeHeight, isPrintMode: effectivePrintMode },
                        draggable: false, selectable: false, zIndex: -1,
                        style: {
                            borderRight: effectivePrintMode ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.05)',
                            borderBottom: effectivePrintMode ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.05)',
                            background: 'transparent'
                        }
                    });
                });
                rowX += (lanes.length * LANE_WIDTH);

                const MUTU_WIDTHS = [120, 80, 100]; // Kelengkapan, Waktu, Output
                let currentMutuX = rowX;
                ['mutuBakuKelengkapan', 'mutuBakuWaktu', 'mutuBakuOutput'].forEach((field, i) => {
                    currentPageNodes.push({
                        id: `row-${field}-${index}`, type: 'infoNode', position: { x: currentMutuX, y: currentY },
                        data: { type: 'aktivitas', value: step[field] || '-', width: MUTU_WIDTHS[i], height: nodeHeight, isPrintMode: effectivePrintMode },
                        draggable: false, zIndex: 1,
                    });
                    currentMutuX += MUTU_WIDTHS[i];
                });
                rowX = currentMutuX;


                currentPageNodes.push({
                    id: `row-ket-${index}`, type: 'infoNode', position: { x: rowX, y: currentY },
                    data: { type: 'keterangan', value: step.keterangan || '-', width: COL_KETERANGAN_WIDTH, height: nodeHeight, isPrintMode: effectivePrintMode },
                    draggable: false, zIndex: 1,
                });

                if (index < steps.length - 1) {
                    const gapY = currentY + nodeHeight;
                    let gapX = 0;

                    currentPageNodes.push({
                        id: `gap-no-${index}`,
                        type: 'gapColumnNode',
                        position: { x: gapX, y: gapY },
                        data: { width: COL_NO_WIDTH, height: VERTICAL_GAP, isPrintMode: effectivePrintMode },
                        draggable: false,
                        selectable: false,
                        zIndex: 0,
                    });
                    gapX += COL_NO_WIDTH;

                    currentPageNodes.push({
                        id: `gap-keg-${index}`,
                        type: 'gapColumnNode',
                        position: { x: gapX, y: gapY },
                        data: { width: COL_KEGIATAN_WIDTH, height: VERTICAL_GAP, isPrintMode: effectivePrintMode },
                        draggable: false,
                        selectable: false,
                        zIndex: 0,
                    });
                    gapX += COL_KEGIATAN_WIDTH;

                    lanes.forEach((_: any, i: number) => {
                        currentPageNodes.push({
                            id: `gap-lane-${index}-${i}`,
                            type: 'gapColumnNode',
                            position: { x: gapX + (i * LANE_WIDTH), y: gapY },
                            data: { width: LANE_WIDTH, height: VERTICAL_GAP, isPrintMode: effectivePrintMode },
                            draggable: false,
                            selectable: false,
                            zIndex: 0,
                        });
                    });
                    gapX += (lanes.length * LANE_WIDTH);

                    ['gap-mutu-kelengkapan', 'gap-mutu-waktu', 'gap-mutu-output'].forEach((field, fieldIndex) => {
                        currentPageNodes.push({
                            id: `${field}-${index}`,
                            type: 'gapColumnNode',
                            position: { x: gapX + (fieldIndex * COL_MUTU_WIDTH), y: gapY },
                            data: { width: COL_MUTU_WIDTH, height: VERTICAL_GAP, isPrintMode: effectivePrintMode },
                            draggable: false,
                            selectable: false,
                            zIndex: 0,
                        });
                    });
                    gapX += (3 * COL_MUTU_WIDTH);

                    currentPageNodes.push({
                        id: `gap-ket-${index}`,
                        type: 'gapColumnNode',
                        position: { x: gapX, y: gapY },
                        data: { width: COL_KETERANGAN_WIDTH, height: VERTICAL_GAP, isPrintMode: effectivePrintMode },
                        draggable: false,
                        selectable: false,
                        zIndex: 0,
                    });
                }

                currentY += nodeHeight + VERTICAL_GAP;
            });

            pages.push({ index: pageIndex, nodes: [...currentPageNodes] });

            // --- LOAD SAVED NODES AND EDGES ---
            let savedEdges: any[] = [];
            let savedNodes: any[] = [];

            // 1. Try to load from the dedicated SopFlowchart model first if available 
            if (sopData?.sopFlowchart?.flowchartJson) {
                const fullFlow = smartParse(sopData.sopFlowchart.flowchartJson, null);
                if (fullFlow) {
                    savedNodes = Array.isArray(fullFlow.nodes) ? fullFlow.nodes : [];
                    savedEdges = Array.isArray(fullFlow.edges) ? fullFlow.edges : [];
                    console.log(`[SopFlowchart] Loaded ${savedNodes.length} nodes and ${savedEdges.length} edges from SopFlowchart model`);
                }
            }

            // 2. Fallback to legacy connectorPaths for edges if still empty
            if (savedEdges.length === 0) {
                savedEdges = smartParse(sopData?.connectorPaths, []);
            }

            const allNodes = pages.flatMap(p => p.nodes.map(n => {
                const baseNode = { ...n, position: { ...n.position, y: n.position.y + p.index * (PAGE_HEIGHT + PAGE_GAP) } };

                // If we have a saved position for this specific node ID, use it!
                if (savedNodes.length > 0) {
                    const saved = savedNodes.find(sn => sn.id === n.id);
                    if (saved && saved.position) {
                        return { ...baseNode, position: saved.position };
                    }
                }
                return baseNode;
            }));

            // If we have saved edges, use them. Otherwise, generate automatically.
            let finalEdges: any[] = [];
            const validNodeIds = new Set(allNodes.map(n => n.id));
            const nodeMap = new Map(allNodes.map(n => [n.id, n]));
            const normalizeDecisionEdge = (edge: any) => {
                const sourceNode = nodeMap.get(edge.source);
                const targetNode = nodeMap.get(edge.target);
                if (sourceNode?.type !== 'sopNode' || sourceNode?.data?.stepType !== 'decision' || !targetNode) {
                    // Even if not a decision, apply base colors if label is present
                    const isNo = edge.label === 'Tidak';
                    const isYa = edge.label === 'Ya';
                    if (isNo || isYa) {
                        const stroke = isNo ? '#f43f5e' : '#10b981';
                        return {
                            ...edge,
                            animated: !effectivePrintMode,
                            style: { ...edge.style, stroke, strokeWidth: 2.5 },
                            markerEnd: { type: MarkerType.ArrowClosed, color: stroke }
                        };
                    }
                    return edge;
                }

                const noHandles = ['left', 'right', 'no-left', 'no-right'];
                const hasNoSignal = edge.label === 'Tidak' || noHandles.includes(edge.sourceHandle) || String(edge.id || '').includes('-no');
                const hasYesSignal = edge.label === 'Ya' || edge.sourceHandle === 'yes' || String(edge.id || '').includes('-yes');

                const isNo = hasNoSignal;
                const isYa = hasYesSignal && !isNo;

                const dx = (targetNode.position?.x || 0) - (sourceNode.position?.x || 0);

                // Start with the exact saved handles, if any
                let sourceHandle = edge.sourceHandle;

                // Explicitly migrate legacy handles to standard IDs if they are still legacy
                if (sourceHandle === 'yes') sourceHandle = 'bottom';
                if (sourceHandle === 'no-right') sourceHandle = 'right';
                if (sourceHandle === 'no-left') sourceHandle = 'left';

                // If sourceHandle is missing, auto-calculate it based on dx
                if (!sourceHandle) {
                    if (isNo) {
                        sourceHandle = dx >= 0 ? 'right' : 'left';
                    } else {
                        sourceHandle = 'bottom';
                    }
                }

                // If targetHandle is missing, auto-calculate it
                const targetHandle = edge.targetHandle || (isNo ? (dx >= 0 ? 'left-target' : 'right-target') : 'top-target');
                const stroke = isNo ? '#f43f5e' : '#10b981';

                return {
                    ...edge,
                    label: isNo ? 'Tidak' : 'Ya',
                    sourceHandle,
                    targetHandle,
                    type: 'sopEdge',
                    animated: !effectivePrintMode,
                    style: {
                        ...(edge.style || {}),
                        stroke,
                        strokeWidth: edge.style?.strokeWidth || 2.5
                    },
                    labelStyle: {
                        ...(edge.labelStyle || {}),
                        fill: stroke,
                        fontWeight: 600
                    },
                    markerEnd: edge.markerEnd || { type: MarkerType.ArrowClosed, color: stroke }
                };
            };

            if (savedEdges.length > 0) {
                // Use saved edges but ensure they are valid for current nodes
                finalEdges = savedEdges
                    .filter(e => {
                        const hasSource = validNodeIds.has(e.source);
                        const hasTarget = validNodeIds.has(e.target);

                        if (!hasSource || !hasTarget) {
                            console.warn(`[SopFlowchart] Edge ${e.id} has invalid endpoints: source(${e.source})=${hasSource}, target(${e.target})=${hasTarget}. Filtering.`);
                        }
                        return hasSource && hasTarget;
                    })
                    .map(e => ({
                        ...normalizeDecisionEdge(e),
                        data: { ...e.data, isPrintMode: effectivePrintMode }
                    }));

                console.log(`[SopFlowchart] Using ${finalEdges.length} valid saved edges (from ${savedEdges.length} total)`);

                // CRITICAL FIX: If we filtered out ALL saved edges (likely due to ID transition), 
                // fallback to auto-generation so the user doesn't see a blank flowchart.
                if (finalEdges.length === 0 && savedEdges.length > 0 && steps.length > 0) {
                    console.warn(`[SopFlowchart] ALL saved edges were filtered out. Falling back to auto-generation.`);
                    // Fallback will trigger below because finalEdges is empty
                }
            }

            // If no saved edges OR we fell back because valid edges were empty
            // IMPORTANT: We also need to check if we have NODES. If we have nodes but no edges, we should auto-generate edges.
            if (finalEdges.length === 0 && steps.length > 0) {
                console.log(`[SopFlowchart] Auto-generating edges (Steps: ${steps.length})`);
                // Auto-generate edges
                const allPageEdges: any[] = []; // Collect edges across all pages to handle cross-page links
                const outSlotByPage = new Map<number, number>();
                const inSlotByPage = new Map<number, number>();

                pages.forEach(p => {
                    const pNodes = p.nodes.filter(n => n.type === 'sopNode');

                    pNodes.forEach((node, nodeIdx) => {
                        const currentOrder = node.data.no;

                        // Decision Logic
                        if (node.data.stepType === 'decision') {
                            const nextYes = node.data.nextStepYes;
                            const nextNo = node.data.nextStepNo;

                            // Handle YES path (or default next step if not specified)
                            if (nextYes) {
                                const targetNode = allNodes.find(n => n.type === 'sopNode' && n.data.no === nextYes);
                                if (targetNode) {
                                    allPageEdges.push({
                                        id: `edge-${currentOrder}-yes`,
                                        source: node.id,
                                        target: targetNode.id,
                                        sourceHandle: 'bottom',
                                        targetHandle: 'top-target',
                                        label: 'Ya',
                                        type: 'sopEdge',
                                        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
                                        style: { stroke: '#10b981', strokeWidth: 2.5 },
                                        labelStyle: { fill: '#10b981', fontWeight: 600 },
                                        data: { isPrintMode: effectivePrintMode }
                                    });
                                }
                            } else if (nodeIdx < pNodes.length - 1) {
                                // Default flow for YES if not specified
                                const nextNode = pNodes[nodeIdx + 1];
                                allPageEdges.push({
                                    id: `edge-${currentOrder}-yes-default`,
                                    source: node.id, target: nextNode.id,
                                    sourceHandle: 'bottom', targetHandle: 'top-target',
                                    label: 'Ya',
                                    type: 'sopEdge',
                                    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
                                    style: { stroke: '#10b981', strokeWidth: 2.5 },
                                    labelStyle: { fill: '#10b981', fontWeight: 600 },
                                    data: { isPrintMode: effectivePrintMode }
                                });
                            }

                            // Handle NO path
                            if (nextNo) {
                                const targetNode = allNodes.find(n => n.type === 'sopNode' && n.data.no === nextNo);
                                if (targetNode) {
                                    const isSamePage = targetNode.data.pageIndex === node.data.pageIndex;

                                    if (isSamePage) {
                                        // Standard routing for same page
                                        const dx = targetNode.position.x - node.position.x;
                                        // Determine side based on target position relative to source
                                        // If target is to the right, exit right. If left, exit left.
                                        const sourceHandle = dx >= 0 ? 'right' : 'left';

                                        // For target handle, we want to enter from the side facing the source
                                        // But to avoid crossing through the shape, we might want to enter from top/bottom if possible, 
                                        // or use a smart edge type. 
                                        // For "Tidak", standard is exiting side and entering top of target usually, 
                                        // or entering side of target if it's a jump.

                                        // Let's try to find a clear path. 
                                        // If we exit right, we want to enter left of target.
                                        const targetHandle = dx >= 0 ? 'left-target' : 'right-target';

                                        allPageEdges.push({
                                            id: `edge-${currentOrder}-no`,
                                            source: node.id,
                                            target: targetNode.id,
                                            sourceHandle: sourceHandle,
                                            targetHandle: targetHandle,
                                            label: 'Tidak',
                                            type: 'sopEdge', // Custom edge capable of smart routing
                                            markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
                                            style: { stroke: '#f43f5e', strokeWidth: 2.5 },
                                            labelStyle: { fill: '#f43f5e', fontWeight: 600 },
                                            data: { isPrintMode: effectivePrintMode, isDecisionNo: true }
                                        });
                                    } else {
                                        // Cross-page routing via OffPage Connector
                                        // Create a pair of OffPage Connectors (OUT and IN)
                                        // Use unique ID based on source and target step numbers
                                        const connectorLabel = `${currentOrder}→${targetNode.data.no}`;

                                        // 1. Create OUT Connector (on source page)
                                        // Position it below the page (near off-page out)
                                        const outNodeId = `off-page-out-dec-${currentOrder}-${targetNode.data.no}`;

                                        // Check if this node already exists (to avoid duplicates if re-running)
                                        if (!allNodes.find(n => n.id === outNodeId)) {
                                            const pageOutNode = allNodes.find(n => n.id === `off-page-out-${node.data.pageIndex}`);
                                            const baseX = pageOutNode ? pageOutNode.position.x : (flowchartWidth / 2) - 30;
                                            const baseY = pageOutNode ? pageOutNode.position.y : (USABLE_HEIGHT - 20) + (node.data.pageIndex * (PAGE_HEIGHT + PAGE_GAP));

                                            const sourcePageIndex = node.data.pageIndex ?? p.index;
                                            const slotIndex = outSlotByPage.get(sourcePageIndex) ?? 0;
                                            outSlotByPage.set(sourcePageIndex, slotIndex + 1);
                                            const offsetX = ((slotIndex % 6) - 2.5) * 56;
                                            const offsetY = Math.floor(slotIndex / 6) * 26;

                                            const outNode = {
                                                id: outNodeId,
                                                type: 'offPageConnector',
                                                position: {
                                                    x: baseX + offsetX,
                                                    y: baseY + offsetY
                                                },
                                                data: { label: connectorLabel, connectorType: 'decision-out', isPrintMode: effectivePrintMode },
                                                draggable: true, zIndex: 20
                                            };
                                            allNodes.push(outNode);

                                            // Connect Source -> OUT Node
                                            allPageEdges.push({
                                                id: `edge-${currentOrder}-to-off-${outNodeId}`,
                                                source: node.id,
                                                target: outNodeId,
                                                sourceHandle: 'bottom',
                                                targetHandle: 'top',
                                                label: 'Tidak',
                                                type: 'sopEdge',
                                                markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
                                                style: { stroke: '#f43f5e', strokeWidth: 2.5 },
                                                labelStyle: { fill: '#f43f5e', fontWeight: 600 },
                                                data: { isPrintMode: effectivePrintMode, isDecisionNo: true }
                                            });
                                        }

                                        // 2. Create IN Connector (on target page)
                                        const inNodeId = `off-page-in-dec-${currentOrder}-${targetNode.data.no}`;

                                        if (!allNodes.find(n => n.id === inNodeId)) {
                                            const pageInNode = allNodes.find(n => n.id === `off-page-in-${targetNode.data.pageIndex}`);
                                            const baseX = pageInNode ? pageInNode.position.x : (flowchartWidth / 2) - 30;
                                            const baseY = pageInNode ? pageInNode.position.y : TOP_MARGIN + (targetNode.data.pageIndex * (PAGE_HEIGHT + PAGE_GAP));

                                            const targetPageIndex = targetNode.data.pageIndex ?? p.index;
                                            const slotIndex = inSlotByPage.get(targetPageIndex) ?? 0;
                                            inSlotByPage.set(targetPageIndex, slotIndex + 1);
                                            const offsetX = ((slotIndex % 6) - 2.5) * 56;
                                            const offsetY = Math.floor(slotIndex / 6) * 26;

                                            const inNode = {
                                                id: inNodeId,
                                                type: 'offPageConnector',
                                                position: {
                                                    x: baseX + offsetX,
                                                    y: baseY + offsetY
                                                },
                                                data: { label: connectorLabel, connectorType: 'decision-in', isPrintMode: effectivePrintMode },
                                                draggable: true, zIndex: 20
                                            };
                                            allNodes.push(inNode);

                                            // Connect IN Node -> Target
                                            allPageEdges.push({
                                                id: `edge-off-${inNodeId}-to-${targetNode.data.no}`,
                                                source: inNodeId,
                                                target: targetNode.id,
                                                sourceHandle: 'bottom',
                                                targetHandle: 'top-target',
                                                type: 'sopEdge',
                                                markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
                                                style: { stroke: '#f43f5e', strokeWidth: 2.5 },
                                                data: { isPrintMode: effectivePrintMode }
                                            });
                                        }
                                    }
                                }
                            }
                        } else if (nodeIdx < pNodes.length - 1 && node.data.stepType !== 'end') {
                            const nextNode = pNodes[nodeIdx + 1];
                            allPageEdges.push({
                                id: `edge-${currentOrder}-next`,
                                source: node.id, target: nextNode.id,
                                sourceHandle: 'bottom', targetHandle: 'top-target',
                                type: 'sopEdge',
                                markerEnd: { type: MarkerType.ArrowClosed, color: '#334155' },
                                style: { stroke: '#334155', strokeWidth: 2.5 },
                                data: { isPrintMode: effectivePrintMode }
                            });
                        }
                    });

                    // Connect to/from OffPage Connectors
                    const offPageOut = p.nodes.find(n => n.id === `off-page-out-${p.index}`);
                    if (offPageOut) {
                        const lastNode = pNodes.sort((a, b) => b.data.no - a.data.no)[0];
                        if (lastNode && lastNode.data.stepType !== 'end') {
                            allPageEdges.push({
                                id: `edge-${lastNode.id}-to-offpage`,
                                source: lastNode.id, target: offPageOut.id,
                                sourceHandle: 'bottom', targetHandle: 'top',
                                type: 'sopEdge', data: { isPrintMode: effectivePrintMode }
                            });
                        }
                    }

                    const offPageIn = p.nodes.find(n => n.id === `off-page-in-${p.index}`);
                    if (offPageIn && p.index > 0) {
                        const firstNode = pNodes.sort((a, b) => a.data.no - b.data.no)[0];
                        if (firstNode) {
                            allPageEdges.push({
                                id: `edge-offpage-to-${firstNode.id}`,
                                source: offPageIn.id, target: firstNode.id,
                                sourceHandle: 'bottom', targetHandle: 'top-target',
                                type: 'sopEdge', data: { isPrintMode: effectivePrintMode }
                            });
                        }
                    }
                });

                finalEdges = allPageEdges;
            }

            // --- AUTOMATIC PAGE SPLITTING (Points 2, 3, 4, 5) ---
            const processedNodes = [...allNodes];
            const processedEdges: any[] = [];
            const edgeNodeMap = new Map(processedNodes.map(n => [n.id, n]));

            finalEdges.forEach((edge: any) => {
                const source = edgeNodeMap.get(edge.source);
                const target = edgeNodeMap.get(edge.target);

                if (!source || !target) {
                    processedEdges.push(edge);
                    return;
                }

                const sY = source.position.y;
                const tY = target.position.y;
                const sPage = getPage(sY);
                const tPage = getPage(tY);

                // Collect obstacles for routing (only nodes on the same page to keep it fast)
                const obstacles = processedNodes
                    .filter(n => getPage(n.position.y) === sPage)
                    .map(n => ({
                        id: n.id,
                        position: n.position,
                        width: n.measured?.width || (n.data?.width ?? 120),
                        height: n.measured?.height || (n.data?.height ?? 60)
                    }));

                if (sPage === tPage) {
                    processedEdges.push({
                        ...edge,
                        data: { ...edge.data, obstacles, isPrintMode: effectivePrintMode, originalEdge: edge }
                    });
                } else if (sPage < tPage) {
                    // Forward split across multiple boundaries
                    let currentSourceId = edge.source;
                    let currentSourceHandle = edge.sourceHandle || 'bottom';

                    for (let p = sPage; p < tPage; p++) {
                        const boundaryY = (p + 1) * PAGE_HEIGHT + (p * PAGE_GAP);
                        const ratio = Math.max(0.01, Math.min(0.99, (boundaryY - sY) / (tY - sY)));
                        const intersectX = source.position.x + ratio * (target.position.x - source.position.x);
                        const label = String.fromCharCode(65 + (offPageLabelIndex++ % 26));

                        const outId = `off-auto-out-${edge.id}-${p}`;
                        const outNode = {
                            id: outId,
                            type: 'offPageConnector',
                            position: { x: intersectX - 36, y: boundaryY - 48 },
                            data: { label, connectorType: 'auto-out', direction: 'down', isPrintMode: effectivePrintMode },
                            draggable: false, zIndex: 20
                        };
                        processedNodes.push(outNode);
                        edgeNodeMap.set(outId, outNode);

                        processedEdges.push({
                            ...edge,
                            id: `${edge.id}-auto-${p}-1`,
                            source: currentSourceId,
                            target: outId,
                            sourceHandle: currentSourceHandle,
                            targetHandle: 'top',
                            data: { ...edge.data, obstacles, isPrintMode: effectivePrintMode, originalEdge: edge }
                        });

                        const inId = `off-auto-in-${edge.id}-${p}`;
                        const inNode = {
                            id: inId,
                            type: 'offPageConnector',
                            position: { x: intersectX - 36, y: boundaryY + PAGE_GAP + 12 },
                            data: { label, connectorType: 'auto-in', direction: 'down', isPrintMode: effectivePrintMode },
                            draggable: false, zIndex: 20
                        };
                        processedNodes.push(inNode);
                        edgeNodeMap.set(inId, inNode);

                        currentSourceId = inId;
                        currentSourceHandle = 'bottom';
                    }

                    processedEdges.push({
                        ...edge,
                        id: `${edge.id}-auto-final`,
                        source: currentSourceId,
                        target: edge.target,
                        sourceHandle: currentSourceHandle,
                        targetHandle: edge.targetHandle || 'top-target',
                        data: { ...edge.data, obstacles, isPrintMode: effectivePrintMode, originalEdge: edge }
                    });
                } else {
                    // Point 5: Backward cross-page link (Rule: exit UP, enter from BOTTOM)
                    let currentSourceId = edge.source;
                    let currentSourceHandle = edge.sourceHandle || 'top';

                    for (let p = sPage; p > tPage; p--) {
                        // Crossing boundary between page p and p-1
                        const boundaryY_TopSource = p * (PAGE_HEIGHT + PAGE_GAP);
                        const boundaryY_BottomTarget = (p - 1) * (PAGE_HEIGHT + PAGE_GAP) + PAGE_HEIGHT;

                        const ratio = Math.max(0.01, Math.min(0.99, (sY - boundaryY_TopSource) / (sY - tY)));
                        const intersectX = source.position.x + ratio * (target.position.x - source.position.x);
                        const label = String.fromCharCode(65 + (offPageLabelIndex++ % 26));

                        const outId = `off-auto-out-back-${edge.id}-${p}`;
                        const outNode = {
                            id: outId,
                            type: 'offPageConnector',
                            position: { x: intersectX - 36, y: boundaryY_TopSource + 12 },
                            data: { label, connectorType: 'auto-out', direction: 'up', isPrintMode: effectivePrintMode },
                            draggable: false, zIndex: 20
                        };
                        processedNodes.push(outNode);
                        edgeNodeMap.set(outId, outNode);

                        processedEdges.push({
                            ...edge,
                            id: `${edge.id}-auto-back-${p}-1`,
                            source: currentSourceId,
                            target: outId,
                            sourceHandle: currentSourceHandle,
                            targetHandle: 'bottom',
                            data: { ...edge.data, obstacles, isPrintMode: effectivePrintMode, originalEdge: edge }
                        });

                        const inId = `off-auto-in-back-${edge.id}-${p}`;
                        const inNode = {
                            id: inId,
                            type: 'offPageConnector',
                            position: { x: intersectX - 36, y: boundaryY_BottomTarget - 48 },
                            data: { label, connectorType: 'auto-in', direction: 'up', isPrintMode: effectivePrintMode },
                            draggable: false, zIndex: 20
                        };
                        processedNodes.push(inNode);
                        edgeNodeMap.set(inId, inNode);

                        currentSourceId = inId;
                        currentSourceHandle = 'top';
                    }

                    processedEdges.push({
                        ...edge,
                        id: `${edge.id}-auto-back-final`,
                        source: currentSourceId,
                        target: edge.target,
                        sourceHandle: currentSourceHandle,
                        targetHandle: edge.targetHandle || 'bottom-target',
                        data: { ...edge.data, obstacles, isPrintMode: effectivePrintMode, originalEdge: edge }
                    });
                }
            });

            return { pagesData: pages, allNodes: processedNodes, allEdges: processedEdges };
        } catch (error) {
            console.error("Crash in layout engine:", error);
            return { pagesData: [], allNodes: [], allEdges: [] };
        }
    }, [sopData, effectivePrintMode]);

    const [nodes, setNodes, onNodesChange] = useNodesState(allNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(allEdges);
    const [showCoverWarning, setShowCoverWarning] = useState(false);

    const handleResetEdge = useCallback((edgeId: string) => {
        const defaultEdge = allEdges.find(e => e.id === edgeId);
        if (defaultEdge) {
            setEdges(eds => eds.map(e => e.id === edgeId ? {
                ...defaultEdge,
                data: { ...defaultEdge.data, onResetWaypoint: handleResetEdge }
            } : e));
            toast.success("Connector dikembalikan ke posisi awal");
        }
    }, [allEdges, setEdges]);

    const handleResetAllEdges = useCallback(() => {
        if (confirm("Kembalikan semua connector ke posisi default? Perubahan manual akan hilang.")) {
            // Force reset using auto-generated allEdges
            setEdges(allEdges.map(e => ({
                ...e,
                data: { ...e.data, onResetWaypoint: handleResetEdge }
            })));
            toast.success("Semua connector di-reset");
        }
    }, [allEdges, setEdges, handleResetEdge]);

    const onConnect = useCallback((params: any) => {
        const isNo = params.sourceHandle === 'left' || params.sourceHandle === 'right' || params.sourceHandle?.includes('no-');
        const color = isNo ? '#f43f5e' : '#10b981';

        setEdges((eds) => addEdge({
            ...params,
            type: 'sopEdge',
            label: isNo ? 'Tidak' : 'Ya',
            animated: !isPrintMode,
            style: { stroke: color, strokeWidth: 2.5 },
            labelStyle: { fill: color, fontWeight: 600 },
            markerEnd: { type: MarkerType.ArrowClosed, color: color },
            data: { isPrintMode, isHandmade: true }
        }, eds));
    }, [setEdges, isPrintMode]);

    const onReconnect = useCallback((oldEdge: any, newConnection: any) => {
        setEdges((els) => reconnectEdge(oldEdge, {
            ...newConnection,
            type: oldEdge?.type || 'sopEdge',
            label: oldEdge?.label,
            style: oldEdge?.style,
            labelStyle: oldEdge?.labelStyle,
            markerEnd: oldEdge?.markerEnd,
            data: oldEdge?.data
        }, els));
    }, [setEdges]);

    // Use refs to track if initial load has happened to prevent overwriting user changes
    const isInitialLoad = useRef(true);

    // Track the last SOP ID we initialized edges for (to detect a NEW sop being opened, not just a re-render)
    const lastSopDataIdRef = useRef<string | null>(null);
    const lastFlowchartUpdatedRef = useRef<string | null>(null);

    // CRITICAL FIX: Only sync from layout engine edges on initial load or when a truly new SOP opens.
    // After initial load, user canvas edits must be authoritative - do NOT reset them.
    // The previous bug was: save → onDataUpdate → sopData changes → useEffect fires → resets edges to defaults → auto-save saves defaults.
    useEffect(() => {
        const currentSopId = sopData?.id ?? null;
        // Use the flowchartJson as a stable version key (it only changes when YOU save new data)
        const flowchartRef = sopData?.sopFlowchart?.flowchartJson
            ? sopData.sopFlowchart.flowchartJson.slice(0, 50)  // just a hash-like prefix
            : null;

        const isNewSop = currentSopId !== lastSopDataIdRef.current;
        const isNewFlowchart = isNewSop || (flowchartRef !== lastFlowchartUpdatedRef.current && lastFlowchartUpdatedRef.current === null);

        if (!isNewFlowchart && lastSopDataIdRef.current !== null) {
            return; // Same SOP, same or newer data - user edits must be preserved
        }

        lastSopDataIdRef.current = currentSopId;
        lastFlowchartUpdatedRef.current = flowchartRef;

        if (!isPrintMode) {
            if (allEdges.length > 0) {
                setEdges(allEdges.map(e => ({
                    ...e,
                    data: { ...e.data, onResetWaypoint: handleResetEdge }
                })));
            } else if (sopData?.langkahLangkah?.length > 0) {
                setEdges([]);
            }
        } else {
            setEdges(allEdges);
        }

        setNodes(allNodes);
        isInitialLoad.current = false;
    }, [sopData?.id, sopData?.sopFlowchart, isPrintMode]);

    const handleSaveFlowchart = useCallback(async (silent = false) => {
        if (!sopData?.id) return;
        if (!silent) setIsSavingPaths(true);
        try {
            const nodeMap = new Map(nodes.map(n => [n.id, n]));

            // DEBUG: Log current edges state to verify user edits are captured
            console.log('[DEBUG SAVE] Current edges in state:', edges.length);
            edges.forEach((e: any) => {
                console.log(`[DEBUG SAVE] Edge: ${e.id}, sourceHandle: ${e.sourceHandle}, targetHandle: ${e.targetHandle}`);
            });

            // Reconstruct logical edges to prevent saving fragmented auto-split pieces
            // but carefully MERGE BACK any user edits made on the canvas!
            const logicalEdgesMap = new Map<string, any>();
            edges.forEach((e: any) => {
                const originalEdge = e.data?.originalEdge;
                if (originalEdge) {
                    const logicalId = originalEdge.id;
                    const mergedEdge = logicalEdgesMap.get(logicalId) || { ...originalEdge };

                    // If 'e' represents the connection TO the true target node:
                    // (It ends with -final, OR it's a regular unfragmented edge where e.id rests untouched)
                    if (e.id.endsWith('-final') || e.id === originalEdge.id || !e.id.includes('-auto-')) {
                        mergedEdge.target = e.target;
                        mergedEdge.targetHandle = e.targetHandle;
                    }

                    // If 'e' represents the connection FROM the true source node:
                    // (It is either an unsplit edge or the very first out-fragment)
                    // We know it's not starting from a pentagon if source doesn't start with 'off-'
                    if (!String(e.source).startsWith('off-')) {
                        mergedEdge.source = e.source;
                        mergedEdge.sourceHandle = e.sourceHandle;
                    }

                    // Preserve any other ReactFlow dynamic state EXCEPT the embedded originalEdge
                    const { originalEdge: _, ...restData } = e.data || {};
                    mergedEdge.data = { ...mergedEdge.data, ...restData, isPrintMode: false };

                    logicalEdgesMap.set(logicalId, mergedEdge);
                } else if (!e.id.includes('-auto-') && !e.id.includes('off-page')) {
                    // This is a regular edge (drawn manually or previously saved)
                    logicalEdgesMap.set(e.id, { ...e, data: { ...e.data, isPrintMode: false } });
                }
            });
            const logicalEdges = Array.from(logicalEdgesMap.values());

            const normalizedEdges = logicalEdges.map((edge: any) => {
                const sourceNode = nodeMap.get(edge.source);
                const targetNode = nodeMap.get(edge.target);
                if (sourceNode?.type !== 'sopNode' || sourceNode?.data?.stepType !== 'decision' || !targetNode) {
                    return edge;
                }

                const noHandles = ['left', 'right', 'no-left', 'no-right'];
                const hasNoSignal = edge.label === 'Tidak' || noHandles.includes(edge.sourceHandle) || String(edge.id || '').includes('-no');
                const hasYesSignal = edge.label === 'Ya' || edge.sourceHandle === 'yes' || String(edge.id || '').includes('-yes');
                if (!hasNoSignal && !hasYesSignal) {
                    return edge;
                }

                const dx = (targetNode.position?.x || 0) - (sourceNode.position?.x || 0);
                const isNo = edge.label === 'Tidak' || hasNoSignal;

                // Only calculate automatic handles if the edge doesn't already have user-defined handles
                let finalSourceHandle = edge.sourceHandle;
                if (!finalSourceHandle || finalSourceHandle === 'yes') finalSourceHandle = 'bottom';
                if (finalSourceHandle === 'no-right') finalSourceHandle = 'right';
                if (finalSourceHandle === 'no-left') finalSourceHandle = 'left';

                // If it's still generic 'left'/'right' without a specific handle ID, or missing entirely
                if (!finalSourceHandle || finalSourceHandle === 'left' || finalSourceHandle === 'right' || finalSourceHandle === 'top' || finalSourceHandle === 'bottom') {
                    // Let the user's manual handle persist. If none, auto-generate.
                    finalSourceHandle = edge.sourceHandle || (isNo ? (dx >= 0 ? 'right' : 'left') : 'bottom');
                }

                // Similarly for target handles
                let finalTargetHandle = edge.targetHandle;
                if (!finalTargetHandle) {
                    finalTargetHandle = isNo ? (dx >= 0 ? 'left-target' : 'right-target') : 'top-target';
                }

                const stroke = isNo ? '#f43f5e' : '#10b981';

                return {
                    ...edge,
                    label: isNo ? 'Tidak' : 'Ya',
                    sourceHandle: finalSourceHandle,
                    targetHandle: finalTargetHandle,
                    style: {
                        ...(edge.style || {}),
                        stroke,
                        strokeWidth: edge.style?.strokeWidth || 2.5
                    },
                    labelStyle: {
                        ...(edge.labelStyle || {}),
                        fill: stroke,
                        fontWeight: 600
                    },
                    markerEnd: edge.markerEnd || { type: MarkerType.ArrowClosed, color: stroke },
                    data: {
                        ...(edge.data || {}),
                        isPrintMode: false
                    }
                };
            });
            const res = await fetch(`/api/sop-flowchart/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ sop_id: sopData.id, nodes, edges: normalizedEdges })
            });
            if (res.ok) {
                const resData = await res.json();
                if (!silent) toast.success("Rute flowchart berhasil disimpan");
                setLastSaved(new Date());

                // CRITICAL: Notify parent to update its state so we don't 
                // get overwritten by stale props on next parent re-render.
                // However, the save API only returns updatedSop without `langkahLangkah`, 
                // so we MUST MERGE it with existing sopData to avoid wiping out the steps.
                if (onDataUpdate && resData.data) {
                    if (resData.data.sopFlowchart) {
                        onDataUpdate({
                            ...sopData,
                            ...resData.data,
                            // Ensure langkahLangkah from current state is preserved
                            langkahLangkah: resData.data.langkahLangkah || sopData.langkahLangkah
                        });
                    }
                }
            }
        } catch (err) {
            if (!silent) toast.error("Gagal menyimpan rute");
        } finally {
            if (!silent) setIsSavingPaths(false);
        }
    }, [nodes, edges, sopData.id]);

    // Implement Auto-save logic
    useEffect(() => {
        if (isPrintMode || !sopData?.id) return;

        // Skip if we are currently manually saving
        if (isSavingPaths) return;

        // Skip auto-save if initial load is still active
        if (isInitialLoad.current) return;

        // Debounce auto-save
        const timer = setTimeout(() => {
            handleSaveFlowchart(true);
        }, 5000); // 5 second quiet period after activity

        return () => clearTimeout(timer);
    }, [nodes, edges, isPrintMode, sopData?.id, handleSaveFlowchart]);

    const handleExportFinal = async () => {
        if (!sopData?.generatedCoverPath) {
            setShowCoverWarning(true);
            return;
        }

        setIsExportingState(true);
        try {
            toast.info("Memulai proses ekspor PDF...");

            // --- PERFORMANCE OPTIMIZATION: Client-Side Capture ---
            let flowchartImage: string | null = null;
            let finalBreakpoints = { bottoms: [] as number[], tops: [] as number[] };

            try {
                // Determine Flowchart Graph Size computationally
                let lanes = smartParse(sopData?.pelaksana || sopData?.pelaksanaLanes, ['Pelaksana']);
                if (!Array.isArray(lanes) || lanes.length === 0) lanes = ['Pelaksana'];
                const flowchartWidth = COL_NO_WIDTH + COL_KEGIATAN_WIDTH + (lanes.length * LANE_WIDTH) + (3 * COL_MUTU_WIDTH) + COL_KETERANGAN_WIDTH;

                // Get bottom-most Y coordinate
                let highestY = 0;
                nodes.forEach(n => {
                    if (n.position.y + 100 > highestY) highestY = n.position.y + 100;
                });
                const flowchartHeight = highestY + 100;

                // FORCE CAPTURE MODE (Disables SVGs filters, dark mode HUDs, and forces white theme)
                setIsCaptureMode(true);

                // Reset Viewport to fit content exactly at 1.0 zoom
                const currentObj = getViewport();
                setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 0 }); // Apply instantly

                // Wait for React rendering pipeline and DOM transitions to complete
                await new Promise(r => setTimeout(r, 600));

                const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement;
                if (viewportEl) {
                    console.log("📸 [Frontend] Capturing optimized flowchart snapshot...");

                    // We need to temporarily force the wrapper to layout exactly at 1:1 scale
                    // without `transform: scale(x)` distorting the html-to-image capture frame
                    const origTransform = viewportEl.style.transform;
                    viewportEl.style.transform = 'translate(0px, 0px) scale(1)';

                    flowchartImage = await toJpeg(viewportEl, {
                        backgroundColor: '#ffffff',
                        quality: 0.75, // Lower quality to drastically reduce base64 size for Vercel 4.5MB limit
                        pixelRatio: 2.0, // 2.0 is still Retina-level sharp but 40% smaller file footprint than 2.5
                        width: flowchartWidth,
                        height: flowchartHeight,
                        style: {
                            transform: 'translate(0px, 0px) scale(1)', // Ensure it renders flat
                            background: '#ffffff'
                        }
                    });

                    // Restore transform
                    viewportEl.style.transform = origTransform;
                    console.log("✅ [Frontend] Capture successful");
                }

                // Restore Viewport & Exit capture mode
                setViewport(currentObj, { duration: 0 });
                setIsCaptureMode(false);
                await new Promise(r => setTimeout(r, 100)); // allow fade back to designer

                // Extract breakpoints and scale by pixelRatio (2.0) to match the captured image size
                const pixelRatio = 2.0;
                const offPageNodes = nodes.filter((n: any) => n.type === 'offPageConnector');
                finalBreakpoints = {
                    bottoms: offPageNodes
                        .filter((n: any) => n.data?.connectorType === 'page-break-bottom')
                        .map((n: any) => ((n.position.y + (n.measured?.height || 60)) + 60) * pixelRatio)
                        .sort((a, b) => a - b),
                    tops: offPageNodes
                        .filter((n: any) => n.data?.connectorType === 'page-break-top')
                        .map((n: any) => (n.position.y - 140) * pixelRatio)
                        .sort((a, b) => a - b)
                };

            } catch (captureErr) {
                console.warn("⚠️ Client-side capture failed, falling back to full Puppeteer export:", captureErr);
                setIsCaptureMode(false);
            }

            // 1. Trigger Export
            const res = await fetch(`/api/sop-builder/${sopData.id}/export-final`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    flowchartImage,
                    breakpoints: finalBreakpoints
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Gagal memulai ekspor');
            }

            const resData = await res.json();

            // Handle DIRECT response with downloadUrl
            if (resData.downloadUrl) {
                setIsExportingState(false);
                toast.success("PDF berhasil dibuat!");
                window.location.href = resData.downloadUrl;
                if (onExportFinal) onExportFinal(resData.downloadUrl);
                return;
            }

            const { statusUrl } = resData;
            if (!statusUrl) {
                throw new Error('Respons server tidak valid');
            }

            // 2. Poll Status
            let attempts = 0;
            const maxAttempts = 150; // 5 minutes max (2s interval)

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;

                try {
                    const statusRes = await fetch(`${statusUrl}?t=${Date.now()}`, {
                        cache: 'no-store',
                        credentials: 'include'
                    });
                    if (statusRes.status === 404) {
                        throw new Error('Status job ekspor tidak ditemukan. Silakan coba ekspor ulang.');
                    }
                    if (statusRes.status === 401) {
                        throw new Error('Sesi tidak valid. Silakan login ulang dan coba lagi.');
                    }
                    if (!statusRes.ok) continue;

                    const statusData = await statusRes.json();

                    if (statusData && statusData.status === 'completed') {
                        console.log("✅ Export Job Response:", statusData);

                        let finalPath = "";
                        let publicUrl = "";
                        let appDownloadUrl = "";
                        try {
                            if (statusData?.result) {
                                finalPath = statusData.result.finalPdfPath || "";
                                publicUrl = statusData.result.publicUrl || "";
                                appDownloadUrl = statusData.result.appDownloadUrl || "";
                            }
                        } catch (err) {
                            console.error("Error accessing result:", err);
                        }

                        const downloadUrl = appDownloadUrl || publicUrl || (
                            finalPath
                                ? (finalPath.startsWith('http')
                                    ? finalPath
                                    : `https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev/${finalPath}`)
                                : null
                        );

                        if (downloadUrl) {
                            setIsExportingState(false);
                            toast.success("PDF berhasil dibuat!");
                            window.location.href = downloadUrl;
                            if (onExportFinal) onExportFinal(downloadUrl);
                            return;
                        } else {
                            toast.error("Gagal mendapatkan URL file PDF");
                            setIsExportingState(false);
                            return;
                        }
                    } else if (statusData && statusData.status === 'failed') {
                        throw new Error(`Ekspor gagal: ${statusData.error || 'Error tidak diketahui'}`);
                    }

                    console.log(`⏳ Export processing... (${attempts}/${maxAttempts})`);

                } catch (innerErr) {
                    console.warn("Polling glitch:", innerErr);
                    if (innerErr instanceof Error && (innerErr.message.startsWith('Ekspor gagal') || innerErr.message.startsWith('Status job') || innerErr.message.startsWith('Sesi tidak'))) {
                        throw innerErr;
                    }
                }
            }

            throw new Error("Waktu tunggu ekspor habis (timeout)");

        } catch (error) {
            console.error("Export error:", error);
            toast.error(error instanceof Error ? error.message : "Gagal ekspor PDF");
            setIsExportingState(false);
        }
    };

    const onInitPrint = useCallback((instance: any) => {
        setReadyPagesCount(prev => prev + 1);
        // Force exactly 100% scale (no fitView shrinking) for crisp PDF rendering
        setTimeout(() => {
            instance.setViewport({ x: 0, y: 0, zoom: 1 });
        }, 150);
    }, []);

    useEffect(() => {
        if (!isPrintMode) return;
        (window as any).__FLOWCHART_NODES__ = allNodes;
        (window as any).__FLOWCHART_EDGES__ = allEdges;
        if (allNodes.length > 0) {
            const hasBreakpoints = allNodes.some((n: any) => n.type === 'offPageConnector');
            const hasRenderableEdges = allEdges.length > 0 || allNodes.filter((n: any) => n.type === 'sopNode').length <= 1;
            if (hasBreakpoints || pagesData.length <= 1 || hasRenderableEdges) {
                setTimeout(() => {
                    (window as any).flowchartReady = true;
                }, 500);
            }
        }
    }, [isPrintMode, allNodes, allEdges, pagesData.length]);

    const onInit = useCallback((instance: any) => {
        // Standard init for editor mode
    }, []);

    if (isPrintMode) {
        return (
            <div id="flowchart-container" className="bg-white p-0 m-0" style={{ width: '1600px', height: 'auto', overflow: 'visible' }}>
                <style>{`
                    .react-flow__attribution {
                        display: none !important;
                    }
                    .react-flow__viewport {
                        transform: none !important;
                    }
                    .react-flow__pane,
                    .react-flow__renderer,
                    .react-flow__nodes,
                    .react-flow__node,
                    .react-flow__edges {
                        overflow: visible !important;
                    }
                `}</style>
                <div
                    style={{
                        width: '1600px',
                        height: `${allNodes.reduce((max, n) => Math.max(max, n.position.y + 100), 0)}px`,
                        borderTop: '1px solid #000',
                        borderLeft: '1px solid #000',
                        boxSizing: 'border-box'
                    }}
                >
                    <ReactFlow
                        key={`flowchart-${isPrintMode ? 'print' : 'editor'}-${allEdges.length}`} // Force re-render when mode changes or edges count changes
                        nodes={allNodes}
                        edges={allEdges}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        nodesDraggable={false}
                        nodesConnectable={false}
                        elementsSelectable={false}
                        panOnDrag={false}
                        zoomOnScroll={false}
                        panOnScroll={false}
                        zoomOnPinch={false}
                        onInit={onInitPrint}
                    />
                </div>
            </div>
        );
    }


    return (
        <div className="flex h-screen w-full bg-[#020617] overflow-hidden font-sans selection:bg-orange-500/30">


            {/* --- MAIN CENTER WORKSPACE --- */}
            <div className="relative flex-1 flex flex-col h-full overflow-hidden">

                {/* --- COVER WARNING MODAL OVERLAY --- */}
                {showCoverWarning && (
                    <div className="absolute inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                        <div className="relative bg-slate-900 border border-amber-500/50 rounded-3xl p-10 max-w-sm w-full shadow-[0_0_60px_rgba(217,119,6,0.3)] mx-4">
                            {/* Glow Ring */}
                            <div className="absolute inset-0 rounded-3xl bg-amber-500/5 pointer-events-none" />

                            {/* Icon */}
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center">
                                    <FileCheck className="w-9 h-9 text-amber-400" />
                                </div>
                            </div>

                            {/* Text */}
                            <h2 className="text-center text-white font-black text-xl mb-3 tracking-wide">Cover Belum Dibuat</h2>
                            <p className="text-center text-slate-400 text-sm leading-relaxed mb-8">
                                Untuk menerbitkan SOP sebagai PDF, Anda harus <span className="text-amber-300 font-bold">membuat halaman cover</span> terlebih dahulu menggunakan tombol <span className="text-amber-300 font-bold">Generate Cover</span>.
                            </p>

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                {onGenerateCover && (
                                    <Button
                                        onClick={() => { setShowCoverWarning(false); onGenerateCover(); }}
                                        className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-[12px] uppercase tracking-widest shadow-[0_0_20px_rgba(217,119,6,0.4)] transition-all"
                                    >
                                        <FileCheck className="w-4 h-4 mr-2" />
                                        Generate Cover Sekarang
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowCoverWarning(false)}
                                    className="w-full h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white font-black text-[11px] uppercase tracking-widest transition-all"
                                >
                                    Tutup
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* GLOBAL STATUS BAR (Bottom) */}


                <motion.div
                    ref={reactFlowWrapper}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 relative w-full h-full"
                >
                    {/* --- HOLOGRAPHIC NEBULA INFRASTRUCTURE --- */}
                    <div className="absolute inset-0 z-0 bg-[#00020a] overflow-hidden">
                        {/* Deep Space Nebula Layers */}
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.5, 0.3],
                                rotate: [0, 5, 0]
                            }}
                            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)] blur-[100px]"
                        />
                        <motion.div
                            animate={{
                                scale: [1.2, 1, 1.2],
                                opacity: [0.2, 0.4, 0.2],
                                rotate: [0, -5, 0]
                            }}
                            transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute bottom-[-20%] right-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.15)_0%,transparent_70%)] blur-[100px]"
                        />

                        {/* Interactive Orbital Stardust */}
                        {!isPrintMode && (
                            <div className="absolute inset-0 z-[1]">
                                {Array.from({ length: 40 }).map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute rounded-full"
                                        initial={{
                                            x: Math.random() * 2000,
                                            y: Math.random() * 2000,
                                            scale: Math.random() * 0.5 + 0.5,
                                            opacity: Math.random() * 0.3 + 0.1
                                        }}
                                        animate={{
                                            x: [null, Math.random() * 2000],
                                            y: [null, Math.random() * 2000],
                                            opacity: [0.2, 0.5, 0.2]
                                        }}
                                        transition={{
                                            duration: 20 + Math.random() * 40,
                                            repeat: Infinity,
                                            ease: "linear"
                                        }}
                                        style={{
                                            width: i % 5 === 0 ? '4px' : '2px',
                                            height: i % 5 === 0 ? '4px' : '2px',
                                            backgroundColor: i % 3 === 0 ? '#fb923c' : i % 3 === 1 ? '#818cf8' : '#fff',
                                            filter: 'blur(1px)'
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Cosmic Grid Depth */}
                        <div className="absolute inset-0 opacity-[0.07] z-[2]"
                            style={{
                                backgroundImage: `
                                    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                                `,
                                backgroundSize: '100px 100px'
                            }}
                        />
                    </div>

                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 p-3 bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5"
                    >
                        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-3xl border border-white/5">
                            {[
                                { icon: ZoomIn, onClick: () => zoomOut(), label: 'Expand' },
                                { icon: ZoomOut, onClick: () => zoomIn(), label: 'Shrink' },
                                { icon: RotateCcw, onClick: () => { fitView(); setViewport({ x: 0, y: 0, zoom: 0.8 }, { duration: 800 }); }, label: 'Reset View' },
                                { icon: RefreshCw, onClick: handleResetAllEdges, label: 'Reset Layout' }
                            ].map((btn, i) => (
                                <motion.button
                                    key={i}
                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={btn.onClick}
                                    className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10 group relative"
                                >
                                    <btn.icon className="w-5 h-5" />
                                    <span className="absolute -top-10 bg-slate-900 text-[8px] font-black text-white px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest whitespace-nowrap">{btn.label}</span>
                                </motion.button>
                            ))}
                        </div>

                        <div className="h-10 w-px bg-white/10" />

                        <div className="flex items-center gap-3">
                            {!sopData?.generatedCoverPath && onGenerateCover && (
                                <Button
                                    onClick={onGenerateCover}
                                    disabled={isGeneratingCover}
                                    className="h-14 px-8 rounded-[1.5rem] bg-amber-600 hover:bg-amber-500 shadow-[0_0_20px_rgba(217,119,6,0.4)] text-white font-black text-[11px] uppercase tracking-[0.2em] group transition-all"
                                >
                                    {isGeneratingCover ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <FileCheck className="w-4 h-4 mr-3 group-hover:rotate-12 transition-transform" />}
                                    Generate Cover
                                </Button>
                            )}

                            <Button
                                onClick={() => handleSaveFlowchart(false)}
                                disabled={isSavingPaths}
                                className="h-14 px-8 rounded-[1.5rem] bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-black text-[11px] uppercase tracking-[0.2em] group"
                            >
                                {isSavingPaths ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <Save className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />}
                                Sync Flow
                            </Button>

                            <Button
                                onClick={handleExportFinal}
                                disabled={isExportingState || isExporting}
                                className="h-14 px-8 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)] text-white font-black text-[11px] uppercase tracking-[0.2em] group transition-all"
                            >
                                {isExportingState || isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <Download className="w-4 h-4 mr-3 group-hover:translate-y-0.5 transition-transform" />}
                                Publish PDF
                            </Button>
                        </div>
                    </motion.div>

                    {/* --- HOLOGRAPHIC DIAGNOSTIC HUD --- */}
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-5xl"
                    >
                        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] px-8 py-4 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5 relative overflow-hidden group">
                            {/* Scanning Line Effect */}
                            <motion.div
                                animate={{ x: ['100%', '-100%'] }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent w-full h-full pointer-events-none"
                            />

                            <div className="flex items-center gap-6 relative z-10">
                                <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                                    <img src="https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev/logo.png" alt="Logo" className="w-8 h-8 object-contain brightness-110 contrast-125" />
                                </div>
                                <div className="h-10 w-px bg-white/10" />
                                <div className="flex flex-col">
                                    <h1 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-0.5">Tactical Flow Editor</h1>
                                    <span className="text-sm font-black text-white tracking-widest uppercase">Flow Chart Editor</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 relative z-10">
                                <div className="hidden lg:flex items-center gap-6 px-6 h-12 bg-white/5 rounded-2xl border border-white/5 uppercase">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                        <div className="flex flex-col items-start">
                                            <span className="text-[6px] font-black text-slate-500 tracking-tighter">Status</span>
                                            <span className="text-[9px] font-black text-emerald-400 tracking-widest leading-none">Live</span>
                                        </div>
                                    </div>
                                    <div className="w-px h-6 bg-white/10" />
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-[6px] font-black text-slate-500 tracking-tighter">Resolution</span>
                                        <span className="text-[9px] font-black text-white tracking-widest leading-none">Ultra 4K</span>
                                    </div>
                                    <div className="w-px h-6 bg-white/10" />
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-[6px] font-black text-slate-500 tracking-tighter">Auto-Save</span>
                                        <span className={`text-[9px] font-black ${isSavingPaths ? 'text-amber-400 animate-pulse' : 'text-emerald-400'} tracking-widest leading-none`}>
                                            {isSavingPaths ? 'Saving...' : lastSaved ? `Synced ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Enabled'}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    onClick={onBack}
                                    className="h-12 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] group/btn transition-all active:scale-95"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2 group-hover/btn:-translate-x-1 transition-transform" />
                                    Terminal
                                </Button>
                            </div>
                        </div>
                    </motion.div>

                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onReconnect={onReconnect}
                        connectionMode={ConnectionMode.Loose}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        onInit={onInit}
                        fitView
                        className="bg-transparent"
                    >
                        <EnergyBeamFilters />
                        <Background color="#94a3b8" gap={40} size={1} variant={BackgroundVariant.Dots} className="opacity-[0.15]" />
                        <Controls showInteractive={false} showZoom={false} showFitView={false} className="!hidden" />

                        <ExportLoadingOverlay isVisible={!!(isExportingState || isExporting)} />


                    </ReactFlow>


                </motion.div>
            </div>


        </div>
    );
};

export default function SopFlowchart(props: SopFlowchartProps) {
    return (
        <ReactFlowProvider>
            <FlowchartCore {...props} />
        </ReactFlowProvider>
    );
}
