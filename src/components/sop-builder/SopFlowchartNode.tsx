import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';

const SopFlowchartNode = ({ data, selected }: { data: any, selected?: boolean }) => {
    const stepType = data.stepType || 'process';
    const isPrintMode = data?.isPrintMode;

    // Hyper-Premium Color Palette & Effects
    const colors: any = {
        start: {
            bg: 'rgba(59, 130, 246, 0.15)',
            border: '#60a5fa',
            text: '#e2e8f0',
            glow: 'rgba(59, 130, 246, 0.8)',
            accent: '#93c5fd'
        },
        end: {
            bg: 'rgba(37, 99, 235, 0.15)',
            border: '#3b82f6',
            text: '#e2e8f0',
            glow: 'rgba(37, 99, 235, 0.8)',
            accent: '#60a5fa'
        },
        process: {
            bg: 'rgba(99, 102, 241, 0.1)',
            border: '#818cf8',
            text: '#f8fafc',
            glow: 'rgba(99, 102, 241, 0.5)',
            accent: '#a5b4fc'
        },
        decision: {
            bg: 'rgba(249, 115, 22, 0.15)',
            border: '#fb923c',
            text: '#fff7ed',
            glow: 'rgba(249, 115, 22, 0.9)',
            accent: '#fdba74'
        },
        document: {
            bg: 'rgba(245, 158, 11, 0.15)',
            border: '#fbbf24',
            text: '#fffbeb',
            glow: 'rgba(245, 158, 11, 0.7)',
            accent: '#fcd34d'
        },
        input_output: {
            bg: 'rgba(6, 182, 212, 0.15)',
            border: '#22d3ee',
            text: '#ecfeff',
            glow: 'rgba(6, 182, 212, 0.7)',
            accent: '#67e8f9'
        },
        connector: { // New connector style
            bg: 'rgba(168, 85, 247, 0.15)',
            border: '#c084fc',
            text: '#f3e8ff',
            glow: 'rgba(168, 85, 247, 0.8)',
            accent: '#d8b4fe'
        }
    };

    // Standard Black & White styles for official printing (Permenpan RB No. 35/2012)
    const printStyles = {
        bg: '#ffffff',
        border: '#000000',
        text: '#000000',
        glow: 'transparent',
        accent: '#000000'
    };

    const currentStyle = data?.isPrintMode ? printStyles : (colors[stepType as keyof typeof colors] || colors.process);
    const strokeWidth = 2.5;
    const nodeWidth = 84;
    const nodeHeight = 48;

    const renderShape = () => {
        const commonProps = {
            stroke: currentStyle.border,
            strokeWidth: strokeWidth,
        };

        const renderCircuitCore = (w: number, h: number, rx = 0) => (
            <g opacity="0.4">
                <defs>
                    <pattern id={`circuit-${data.no}-${stepType}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 10 10 M 0 10 L 20 10" stroke={currentStyle.border} strokeWidth="0.5" strokeOpacity="0.2" />
                        <circle cx="10" cy="10" r="1" fill={currentStyle.border} fillOpacity="0.3" />
                    </pattern>
                </defs>
                <rect x="0" y="0" width={w} height={h} rx={rx} fill={`url(#circuit-${data.no}-${stepType})`} />
                {/* Central Energy Gem */}
                <rect
                    x={(w / 2) - 8}
                    y={(h / 2) - 8}
                    width="16"
                    height="16"
                    rx="4"
                    fill={currentStyle.glow}
                    className="animate-pulse"
                    style={{ filter: 'blur(8px)', opacity: 0.3 }}
                />
                <path
                    d={`M ${w / 2} ${(h / 2) - 10} L ${(w / 2) + 10} ${h / 2} L ${w / 2} ${(h / 2) + 10} L ${(w / 2) - 10} ${h / 2} Z`}
                    fill="none"
                    stroke={currentStyle.accent}
                    strokeWidth="0.5"
                    strokeOpacity="0.5"
                />
            </g>
        );

        if (stepType === 'start' || stepType === 'end') {
            return (
                <svg width={nodeWidth} height={nodeHeight} viewBox={`0 0 ${nodeWidth} ${nodeHeight}`}>
                    <rect
                        x={strokeWidth / 2}
                        y={strokeWidth / 2}
                        width={nodeWidth - strokeWidth}
                        height={nodeHeight - strokeWidth}
                        rx={nodeHeight / 2}
                        fill={currentStyle.bg}
                        stroke={currentStyle.border}
                        strokeWidth={strokeWidth}
                        className="transition-all duration-300"
                    />
                    <text
                        x="50%"
                        y="54%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={data?.isPrintMode ? "#000000" : "white"}
                        fontSize="18"
                        fontWeight="950"
                        className={`select-none tracking-tight ${data?.isPrintMode ? '' : 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'}`}
                    >
                        {data.no}
                    </text>
                </svg>
            );
        }

        if (stepType === 'connector') {
            const size = 40;
            return (
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={(size / 2) - strokeWidth}
                        fill={currentStyle.bg}
                        stroke={currentStyle.border}
                        strokeWidth={strokeWidth}
                        className="transition-all duration-300"
                    />
                    <text
                        x="50%"
                        y="54%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={data?.isPrintMode ? "#000000" : "white"}
                        fontSize="16"
                        fontWeight="950"
                        className={`select-none tracking-tight ${data?.isPrintMode ? '' : 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'}`}
                    >
                        {data.no}
                    </text>
                </svg>
            );
        }

        if (stepType === 'decision') {
            const dWidth = 100;
            const dHeight = 60;
            return (
                <svg width={dWidth} height={dHeight} viewBox={`0 0 ${dWidth} ${dHeight}`}>
                    <path
                        d={`M ${dWidth / 2} ${strokeWidth} L ${dWidth - strokeWidth} ${dHeight / 2} L ${dWidth / 2} ${dHeight - strokeWidth} L ${strokeWidth} ${dHeight / 2} Z`}
                        fill={currentStyle.bg}
                        stroke={currentStyle.border}
                        strokeWidth={strokeWidth}
                        className="transition-all duration-300"
                    />
                    <text
                        x="50%"
                        y="54%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={data?.isPrintMode ? "#000000" : "white"}
                        fontSize="18"
                        fontWeight="950"
                        className={`select-none tracking-tight ${data?.isPrintMode ? '' : 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'}`}
                    >
                        {data.no}
                    </text>
                </svg>
            );
        }

        if (stepType === 'document') {
            const docW = 80;
            const docH = 54;
            return (
                <svg width={docW} height={docH} viewBox={`0 0 ${docW} ${docH}`}>
                    <path
                        d={`M ${strokeWidth} ${strokeWidth} H ${docW - strokeWidth} V ${docH - 12} Q ${docW * 0.75} ${docH} ${docW / 2} ${docH - 12} T ${strokeWidth} ${docH - 12} Z`}
                        fill={currentStyle.bg}
                        stroke={currentStyle.border}
                        strokeWidth={strokeWidth}
                        className="transition-all duration-300"
                    />
                    <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={data?.isPrintMode ? "#000000" : "white"}
                        fontSize="18"
                        fontWeight="950"
                        className={`select-none tracking-tight ${data?.isPrintMode ? '' : 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'}`}
                    >
                        {data.no}
                    </text>
                </svg>
            );
        }

        if (stepType === 'input_output') {
            const pW = 90;
            const pH = 48;
            const offset = 15;
            // Define brown color specifically for Input/Output shape
            const brownFill = currentStyle.bg;
            const brownStroke = currentStyle.border;

            return (
                <svg width={pW} height={pH} viewBox={`0 0 ${pW} ${pH}`}>
                    <path
                        d={`M ${offset + strokeWidth} ${strokeWidth} L ${pW - strokeWidth} ${strokeWidth} L ${pW - offset - strokeWidth} ${pH - strokeWidth} L ${strokeWidth} ${pH - strokeWidth} Z`}
                        fill={brownFill}
                        stroke={brownStroke}
                        strokeWidth={strokeWidth}
                    />
                    <text
                        x="50%"
                        y="54%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={data?.isPrintMode ? "#000000" : "white"}
                        fontSize="18"
                        fontWeight="950"
                        className={`select-none tracking-tight ${data?.isPrintMode ? '' : 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'}`}
                    >
                        {data.no}
                    </text>
                </svg>
            );
        }

        return (
            <svg width={nodeWidth} height={nodeHeight} viewBox={`0 0 ${nodeWidth} ${nodeHeight}`}>
                <rect
                    x={strokeWidth / 2}
                    y={strokeWidth / 2}
                    width={nodeWidth - strokeWidth}
                    height={nodeHeight - strokeWidth}
                    rx="0"
                    fill={currentStyle.bg}
                    stroke={currentStyle.border}
                    strokeWidth={strokeWidth}
                    className="transition-all duration-300"
                />
                <text
                    x="50%"
                    y="54%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={data?.isPrintMode ? "#000000" : "white"}
                    fontSize="18"
                    fontWeight="950"
                    className={`select-none tracking-tight ${data?.isPrintMode ? 'sop-node-text-print' : 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'}`}
                >
                    {data.no}
                </text>
            </svg>
        );
    };

    const handleClass = "!bg-slate-500 !border-white !border-2 !w-3 !h-3 transition-all hover:!scale-150 hover:!bg-indigo-500 !z-[60] shadow-[0_0_10px_rgba(0,0,0,0.5)]";
    const targetHandleClass = "!w-4 !h-4 !opacity-0 !z-40";

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`group cursor-grab active:cursor-grabbing relative ${selected ? 'z-50' : 'z-10'}`}
        >
            {/* selection Matrix FX */}
            <AnimatePresence>
                {selected && (
                    <>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.1, 0.4] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-[-15px] rounded-[30px] border-2 border-indigo-500/40 z-0 blur-[3px]"
                        />
                        {/* Spinning Orbital Rings */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-[-20px] border border-dashed border-indigo-500/20 rounded-full pointer-events-none"
                        />
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-[-25px] border border-dotted border-indigo-400/10 rounded-full pointer-events-none"
                        />
                    </>
                )}
            </AnimatePresence>

            {/* Custom Background Glow (Ambient) */}
            {!data?.isPrintMode && (
                <div
                    className="absolute inset-[-5px] rounded-full transition-all duration-700 opacity-20 group-hover:opacity-40 pointer-events-none blur-2xl"
                    style={{ backgroundColor: currentStyle.glow }}
                />
            )}

            {/* Universal Handles - Standard IDs for maximum reliability - Kept in DOM for connections but hidden in Print Mode */}
            <div style={{ opacity: data?.isPrintMode ? 0 : 1, pointerEvents: data?.isPrintMode ? 'none' : 'auto' }}>
                <Handle type="source" position={Position.Top} id="top" className={handleClass} />
                <Handle type="target" position={Position.Top} id="top-target" className={targetHandleClass} />
                <Handle type="source" position={Position.Bottom} id="bottom" className={handleClass} />
                <Handle type="target" position={Position.Bottom} id="bottom-target" className={targetHandleClass} />
                <Handle type="source" position={Position.Left} id="left" className={handleClass} />
                <Handle type="target" position={Position.Left} id="left-target" className={targetHandleClass} />
                <Handle type="source" position={Position.Right} id="right" className={handleClass} />
                <Handle type="target" position={Position.Right} id="right-target" className={targetHandleClass} />

                {/* Semantic Aliases - Hidden fallback for legacy/saved edges (Universal for maximum compatibility) */}
                <Handle type="source" position={Position.Bottom} id="yes" style={{ opacity: 0, pointerEvents: 'none', width: '4px', height: '4px' }} />
                <Handle type="source" position={Position.Right} id="no-right" style={{ opacity: 0, pointerEvents: 'none', width: '4px', height: '4px' }} />
                <Handle type="source" position={Position.Left} id="no-left" style={{ opacity: 0, pointerEvents: 'none', width: '4px', height: '4px' }} />
            </div>

            <div className={`flex items-center justify-center transition-all duration-500 ${selected ? 'scale-110' : ''}`}
                style={{
                    filter: data?.isPrintMode ? 'none' : (selected ? `drop-shadow(0 0 25px ${currentStyle.glow})` : `drop-shadow(0 0 10px ${currentStyle.glow}66)`)
                }}
            >
                {renderShape()}

                {/* REDESIGNED HOLOGRAPHIC TOOLTIP */}
                <div className="absolute top-[-75px] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none z-[100] scale-50 group-hover:scale-100 origin-bottom">
                    <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)] min-w-[200px] text-center relative">
                        {/* Tooltip Header */}
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse`} style={{ backgroundColor: currentStyle.border }} />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">{stepType.replace('_', ' ')}</span>
                        </div>
                        <div className="text-[13px] font-bold text-white leading-snug tracking-tight px-1">{data.aktivitas}</div>
                        {/* Micro Details */}
                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[8px] font-black text-slate-600 uppercase">Unit: {data.pelaksana}</span>
                            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Active</span>
                        </div>
                        {/* Tooltip Arrow */}
                        <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950/90 border-r border-b border-white/10 rotate-45" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default memo(SopFlowchartNode);
