import React, { useRef, useState, useEffect } from 'react';
import { useValue, bindLocalValue, bindValue, trigger } from 'cs2/api';
import { toolbarBottom, economyBudget } from 'cs2/bindings';
import mod from "mod.json";

// Format numbers with commas (e.g., 123456 → "123,456")
const formatNumber = (value: number): string => {
    const abs = Math.abs(Math.trunc(value));
    const str = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    // Trim to max 9 digits (excluding commas)
    return str.replace(/,/g, '').slice(0, 9).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Helper to format money with + or - sign before the ¢
const formatSignedMoney = (value: number): string => {
    if (value > 0) return `+¢${formatNumber(value)}`;
    if (value < 0) return `-¢${formatNumber(value)}`;
    return `¢${formatNumber(value)}`;
};

// Helper to format population with + or - sign (no ¢)
const formatSignedPop = (value: number): string => {
    if (value > 0) return `+${formatNumber(value)}`;
    if (value < 0) return `-${formatNumber(value)}`;
    return formatNumber(value);
};

export const ShowTrendsComponent = () => {
    // Money stats
    const moneyPerHour = useValue(toolbarBottom.moneyDelta$); // hourly rate

    // Get monthly income and expenses from economyBudget
    const totalIncome = useValue(economyBudget.totalIncome$);
    const totalExpenses = useValue(economyBudget.totalExpenses$);

    // Calculate monthly balance: income - expenses (ensure expenses is positive)
    const monthlyBalance = (totalIncome || 0) - Math.abs(totalExpenses || 0);

    // Population stats
    const popPerHour = useValue(toolbarBottom.populationDelta$); // hourly rate

    // Enhanced color function with glow effects - ensure we always get a number
    const getColor = (value: number | null | undefined) => {
        const numValue = typeof value === 'number' ? value : 0;
        return numValue >= 0 ? '#00FF88' : '#FF4466';
    };
    const getGlowColor = (value: number | null | undefined) => {
        const numValue = typeof value === 'number' ? value : 0;
        return numValue >= 0 ? '#00FF88' : '#FF4466';
    };

    // Position state (load from saved or default)
    const [position, setPosition] = useState({
        x: (window.innerWidth - 320) / 2, // horizontally centered
        y: window.innerHeight * 0.8,      // about 80% down from top, so about 40% up from bottom
    });

    // Resizable box state (size)
    const [size, setSize] = useState({
        width: 320,
        height: 90,
    });

    // Dragging state for moving window
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const boxStart = useRef({ x: 0, y: 0 });

    // Resizing state
    const [resizing, setResizing] = useState<null | string>(null);
    const resizeStart = useRef({ x: 0, y: 0 });
    const sizeStart = useRef({ width: 0, height: 0 });
    const posStart = useRef({ x: 0, y: 0 });

    // Show/hide state
    const [visible, setVisible] = useState(true);

    // Hover state for main box
    const [boxHovered, setBoxHovered] = useState(false);

    // Animation state
    const [pulseKey, setPulseKey] = useState(0);

    // Keep track of previous sign of monthlyBalance
    const prevSign = useRef(Math.sign(monthlyBalance));

    // Trigger pulse animation only when sign of monthlyBalance changes
    useEffect(() => {
        const currentSign = Math.sign(monthlyBalance);
        if (currentSign !== prevSign.current) {
            setPulseKey(prev => prev + 1);
            prevSign.current = currentSign;
        }
    }, [monthlyBalance]);


    let loadedposX = 0;
    let loadedposY = 0;

    try {
        const loadedXBinding = bindValue<number>(mod.id, "LoadPositionX");
        const loadedYBinding = bindValue<number>(mod.id, "LoadPositionY");

        loadedposX = useValue(loadedXBinding) ?? 0;
        loadedposY = useValue(loadedYBinding) ?? 0;
    } catch (e) {
        console.error("Failed to load saved position:", e);
    }


    // Load saved position on mount
    useEffect(() => {
        (async () => {
            try {

                const clampedX = Math.max(0, Math.min(window.innerWidth - size.width, loadedposX));
                const clampedY = Math.max(0, Math.min(window.innerHeight - size.height, loadedposY));
  
                setPosition({ x: clampedX, y: clampedY });


            } catch (err) {

            }
        })();
    }, [size.width, size.height]);

    // Drag window handlers
    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (resizing) return; // prevent dragging if resizing

        setDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        boxStart.current = { ...position };
        document.body.style.userSelect = 'none';
        e.stopPropagation();
    };

    // Start resizing on mouse down on handle
    const onResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>, direction: string) => {
        e.stopPropagation();
        e.preventDefault();
        setResizing(direction);
        resizeStart.current = { x: e.clientX, y: e.clientY };
        sizeStart.current = { ...size };
        posStart.current = { ...position };
        document.body.style.userSelect = 'none';
    };

    useEffect(() => {
        if (!dragging && !resizing) return;

        const onMouseMove = (e: MouseEvent) => {
            if (dragging) {
                const dx = e.clientX - dragStart.current.x;
                const dy = e.clientY - dragStart.current.y;
                let newX = boxStart.current.x + dx;
                let newY = boxStart.current.y + dy;

                // Keep the box within the window bounds
                newX = Math.max(0, Math.min(window.innerWidth - size.width, newX));
                newY = Math.max(0, Math.min(window.innerHeight - size.height, newY));

                setPosition({ x: newX, y: newY });
                // Save position while dragging
                trigger(mod.id, "SavePosition", newX, newY);
            } else if (resizing) {
                const dx = e.clientX - resizeStart.current.x;
                const dy = e.clientY - resizeStart.current.y;

                let newWidth = sizeStart.current.width;
                let newHeight = sizeStart.current.height;
                let newX = posStart.current.x;
                let newY = posStart.current.y;

                const minWidth = 240;
                const minHeight = 80;

                if (resizing.includes('right')) {
                    newWidth = Math.max(minWidth, sizeStart.current.width + dx);
                    if (newWidth + newX > window.innerWidth) newWidth = window.innerWidth - newX;
                }
                if (resizing.includes('bottom')) {
                    newHeight = Math.max(minHeight, sizeStart.current.height + dy);
                    if (newHeight + newY > window.innerHeight) newHeight = window.innerHeight - newY;
                }
                if (resizing.includes('left')) {
                    newWidth = Math.max(minWidth, sizeStart.current.width - dx);
                    newX = Math.min(posStart.current.x + dx, posStart.current.x + sizeStart.current.width - minWidth);
                    if (newX < 0) {
                        newWidth += newX;
                        newX = 0;
                    }
                }
                if (resizing.includes('top')) {
                    newHeight = Math.max(minHeight, sizeStart.current.height - dy);
                    newY = Math.min(posStart.current.y + dy, posStart.current.y + sizeStart.current.height - minHeight);
                    if (newY < 0) {
                        newHeight += newY;
                        newY = 0;
                    }
                }

                setPosition({ x: newX, y: newY });
                setSize({ width: newWidth, height: newHeight });
                // Save position while resizing
                trigger(mod.id, "SavePosition", newX, newY);
            }
        };

        const onMouseUp = () => {
            setDragging(false);
            setResizing(null);
            document.body.style.userSelect = '';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [dragging, resizing, position.x, position.y, size.width, size.height]);

    // Safe number conversion
    const safeMoneyPerHour = typeof moneyPerHour === 'number' ? moneyPerHour : 0;
    const safePopPerHour = typeof popPerHour === 'number' ? popPerHour : 0;
    const safeMonthlyBalance = typeof monthlyBalance === 'number' ? monthlyBalance : 0;

    // Dynamic font size based on width of box, between 12 and 18 px
    const baseWidth = 320;
    const baseFontSize = 16;
    const minFontSize = 6;
    const scale = size.width / baseWidth;
    const fontSize = Math.max(minFontSize, baseFontSize * scale);

    return (
        <>
            {/* Show Trends button */}
            {!visible && (
                <button
                    onClick={() => setVisible(true)}
                    style={{
                        position: 'fixed',
                        top: 20,
                        left: '50%',
                        width: 120,          // FIXED width
                        transform: 'translateX(-50%) scale(1)', // include initial scale 1
                        transformOrigin: 'center center',
                        background: 'linear-gradient(135deg, rgba(0,15,30,0.9) 0%, rgba(15,0,30,0.9) 50%, rgba(0,15,30,0.9) 100%)',
                        border: '1px solid rgba(0,255,136,0.4)',
                        color: '#fff',
                        fontWeight: 'bold',
                        borderRadius: 8,
                        padding: '8px 14px',
                        cursor: 'pointer',
                        zIndex: 999999,
                        fontSize: 13,
                        boxShadow: '0 0 8px rgba(0,255,136,0.2)',
                        backdropFilter: 'blur(6px)',
                        transition: 'all 0.2s ease',
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        display: 'inline-block',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,20,40,0.95) 0%, rgba(20,0,40,0.95) 50%, rgba(0,20,40,0.95) 100%)';
                        e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)'; // only scale changes
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,15,30,0.9) 0%, rgba(15,0,30,0.9) 50%, rgba(0,15,30,0.9) 100%)';
                        e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
                    }}
                    title="Show trends"
                >
                    Show Trends
                </button>
            )}

            {/* Main draggable container */}
            {visible && (
                <div
                    key={pulseKey}
                    onMouseDown={onMouseDown}
                    style={{
                        position: 'fixed',
                        left: position.x,
                        top: position.y,
                        width: size.width,
                        height: size.height,
                        padding: '12px 50px 12px 18px',
                        background: boxHovered
                            ? 'linear-gradient(135deg, rgba(0,20,40,0.95), rgba(20,0,40,0.95), rgba(0,20,40,0.95))'
                            : 'linear-gradient(135deg, rgba(0,15,30,0.9), rgba(15,0,30,0.9), rgba(0,15,30,0.9))',
                        color: 'white',
                        fontSize: `${fontSize}px`,
                        borderRadius: '12px',
                        border: boxHovered
                            ? '2px solid rgba(0,255,136,0.6)'
                            : '2px solid rgba(255,255,255,0.2)',
                        zIndex: 999999,
                        minWidth: 320,
                        minHeight: 60,
                        maxWidth: '90vw',
                        maxHeight: '70vh',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        boxShadow: boxHovered
                            ? `0 0 20px rgba(0,255,136,0.3), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`
                            : `0 0 15px rgba(0,255,136,0.2), 0 6px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`,
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        backdropFilter: 'blur(10px)',
                        transition: dragging || resizing ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: boxHovered ? 'scale(1.02)' : 'scale(1)',
                        animation: 'pulse 0.6s ease-out',
                        cursor: dragging || resizing ? (dragging ? 'grabbing' : 'nwse-resize') : 'grab',
                        overflow: 'hidden',
                    }}
                    onMouseEnter={() => setBoxHovered(true)}
                    onMouseLeave={() => setBoxHovered(false)}
                >
                    {/* Glow/pulse style */}
                    <style>
                        {`
                        @keyframes pulse {
                            0% { transform: scale(1); }
                            50% { transform: scale(1.05); box-shadow: 0 0 25px rgba(0,255,136,0.5), 0 8px 32px rgba(0,0,0,0.4); }
                            100% { transform: scale(1); }
                        }
                        @keyframes glow {
                            0%, 100% {
                                text-shadow: 0 0 5px currentColor, 0 0 5px currentColor;
                            }
                            50% {
                                text-shadow: 0 0 15px currentColor, 0 0 25px currentColor;
                            }
                        }
                        .stat-value {
                            animation: glow 2s ease-in-out infinite;
                        }
                        .cs2-stats-close-btn {
                            flex-shrink: 0;
                        }
                        .resize-handle {
                            position: absolute;
                            background: transparent;
                            z-index: 10;
                        }
                        .resize-handle:hover {
                            background: rgba(0,255,136,0.3);
                        }
                        .resize-handle-corner {
                            width: 16px;
                            height: 16px;
                        }
                        .resize-handle-edge-horizontal {
                            height: 8px;
                            width: 100%;
                        }
                        .resize-handle-edge-vertical {
                            width: 8px;
                            height: 100%;
                        }
                        .resize-handle-top {
                            top: 0;
                            left: 8px;
                            right: 8px;
                            cursor: ns-resize;
                        }
                        .resize-handle-bottom {
                            bottom: 0;
                            left: 8px;
                            right: 8px;
                            cursor: ns-resize;
                        }
                        .resize-handle-left {
                            top: 8px;
                            bottom: 8px;
                            left: 0;
                            cursor: ew-resize;
                        }
                        .resize-handle-right {
                            top: 8px;
                            bottom: 8px;
                            right: 0;
                            cursor: ew-resize;
                        }
                        .resize-handle-top-left {
                            top: 0;
                            left: 0;
                            cursor: nwse-resize;
                        }
                        .resize-handle-top-right {
                            top: 0;
                            right: 0;
                            cursor: nesw-resize;
                        }
                        .resize-handle-bottom-left {
                            bottom: 0;
                            left: 0;
                            cursor: nesw-resize;
                        }
                        .resize-handle-bottom-right {
                            bottom: 0;
                            right: 0;
                            cursor: nwse-resize;
                        }
                    `}
                    </style>

                    {/* Close Button */}
                    <button
                        className="cs2-stats-close-btn"
                        onClick={e => {
                            e.stopPropagation();
                            setVisible(false);
                        }}
                        style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            background: 'rgba(255,68,102,0.3)',
                            border: '1px solid rgba(255,68,102,0.5)',
                            color: '#fff',
                            fontWeight: 'bold',
                            borderRadius: '50%',
                            width: 20,
                            height: 20,
                            cursor: 'pointer',
                            fontSize: 14,
                            lineHeight: '16px',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 3,
                            transition: 'all 0.2s ease',
                            userSelect: 'none',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(255,68,102,0.6)';
                            e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255,68,102,0.3)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Hide stats"
                        tabIndex={0}
                    >
                        X
                    </button>

                    {/* Stats content */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            flexGrow: 1,
                            overflow: 'auto',
                        }}
                    >
                        {/* Money Stats */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                            <span style={{ fontWeight: 'bold', marginRight: 8, fontSize: fontSize * 0.9, color: 'white' }}>
                                Money:
                            </span>
                            <span className="stat-value" style={{
                                color: getColor(safeMoneyPerHour),
                                fontWeight: 600,
                                textShadow: `0 0 10px ${getGlowColor(safeMoneyPerHour)}`,
                                fontSize: fontSize,
                            }}>
                                {formatSignedMoney(safeMoneyPerHour)}
                            </span>
                            <span style={{ color: getColor(safeMoneyPerHour), opacity: 0.8, fontSize: fontSize * 0.85 }}>
                                /h,&nbsp;
                            </span>
                            <span className="stat-value" style={{
                                color: getColor(safeMonthlyBalance),
                                fontWeight: 600,
                                textShadow: `0 0 10px ${getGlowColor(safeMonthlyBalance)}`,
                                fontSize: fontSize,
                            }}>
                                {formatSignedMoney(safeMonthlyBalance)}
                            </span>
                            <span style={{ color: getColor(safeMonthlyBalance), opacity: 0.8, fontSize: fontSize * 0.85 }}>
                                /m
                            </span>
                        </div>

                        {/* Population Stats */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                            <span style={{ fontWeight: 'bold', marginRight: 8, fontSize: fontSize * 0.9, color: 'white' }}>
                                Pop:
                            </span>
                            <span className="stat-value" style={{
                                color: getColor(safePopPerHour),
                                fontWeight: 600,
                                textShadow: `0 0 10px ${getGlowColor(safePopPerHour)}`,
                                fontSize: fontSize,
                            }}>
                                {formatSignedPop(safePopPerHour)}
                            </span>
                            <span style={{ color: getColor(safePopPerHour), opacity: 0.8, fontSize: fontSize * 0.85 }}>
                                /h
                            </span>
                        </div>
                    </div>

                    {/* Resize Handles */}
                    <div className="resize-handle resize-handle-top" onMouseDown={e => onResizeMouseDown(e, 'top')} />
                    <div className="resize-handle resize-handle-bottom" onMouseDown={e => onResizeMouseDown(e, 'bottom')} />
                    <div className="resize-handle resize-handle-left" onMouseDown={e => onResizeMouseDown(e, 'left')} />
                    <div className="resize-handle resize-handle-right" onMouseDown={e => onResizeMouseDown(e, 'right')} />
                    <div className="resize-handle resize-handle-top-left resize-handle-corner" onMouseDown={e => onResizeMouseDown(e, 'top-left')} />
                    <div className="resize-handle resize-handle-top-right resize-handle-corner" onMouseDown={e => onResizeMouseDown(e, 'top-right')} />
                    <div className="resize-handle resize-handle-bottom-left resize-handle-corner" onMouseDown={e => onResizeMouseDown(e, 'bottom-left')} />
                    <div className="resize-handle resize-handle-bottom-right resize-handle-corner" onMouseDown={e => onResizeMouseDown(e, 'bottom-right')} />
                </div>
            )}
        </>
    );
};
