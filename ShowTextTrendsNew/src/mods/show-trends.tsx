import React, { useRef, useState, useEffect } from 'react';
import { useValue, bindLocalValue, bindValue, trigger } from 'cs2/api';
import { toolbarBottom, economyBudget } from 'cs2/bindings';
import mod from "mod.json";
import { load } from 'cheerio';

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


const useWindowDimensions = () => {
    const [windowDimensions, setWindowDimensions] = useState({
        width: typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 1920,
        height: typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 1080,
    });

    useEffect(() => {
        const handleResize = () => {
            const newWidth = window.innerWidth || 1920;
            const newHeight = window.innerHeight || 1080;

            setWindowDimensions({
                width: newWidth > 0 ? newWidth : 1920,
                height: newHeight > 0 ? newHeight : 1080,
            });
        };

        window.addEventListener('resize', handleResize);
        // Set initial values
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowDimensions;
};


export const ShowTrendsComponent = () => {
    const { width: rawWindowWidth, height: rawWindowHeight } = useWindowDimensions();

    // Add validation to ensure dimensions are always valid
    const safeWindowWidth = rawWindowWidth && rawWindowWidth > 0 ? rawWindowWidth : 1920;
    const safeWindowHeight = rawWindowHeight && rawWindowHeight > 0 ? rawWindowHeight : 1080;

    const MAX_WIDTH = 800;  // Maximum width in pixels
    const MAX_HEIGHT = 600; // Maximum height in pixels
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
        x: (safeWindowWidth - 330) / 2,
        y: safeWindowHeight * 0.8,
    });

    // Resizable box state (size)
    const [size, setSize] = useState({
        width: 330,
        height: 80,
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
    const [visible, setVisible] = useState(2);

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



    //Position
    const loadedXBinding = bindValue<number>(mod.id, "LoadPositionX");
    const loadedYBinding = bindValue<number>(mod.id, "LoadPositionY");

    const loadedPosX = useValue(loadedXBinding);
    const loadedPosY = useValue(loadedYBinding);

    //Size
    const loadedWidthBinding = bindValue<number>(mod.id, "LoadSizeWidth");
    const loadedHeightBinding = bindValue<number>(mod.id, "LoadSizeHeight");

    const loadedVisBinding = bindValue<number>(mod.id, "LoadSavedVis");

    const loadedWidth = useValue(loadedWidthBinding);
    const loadedHeight = useValue(loadedHeightBinding);

    const savedVisible = useValue(loadedVisBinding); 
  


    // Load saved position on mount
    useEffect(() => {
        if (typeof loadedPosX === 'number' && typeof loadedPosY === 'number') {
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - size.width, loadedPosX)),
                y: Math.max(0, Math.min(window.innerHeight - size.height, loadedPosY)),
            });
        }
    }, [loadedWidth, loadedHeight, size.width, size.height]);

    // Load saved size on mount
    // Load saved size on mount with validation
    useEffect(() => {
        if (typeof loadedWidth === 'number' && typeof loadedHeight === 'number') {

            // Validate the loaded values before using them
            const validWidth = loadedWidth > 0 && loadedWidth >= 330 ? loadedWidth : 330;
            const validHeight = loadedHeight > 0 && loadedHeight >= 80 ? loadedHeight : 80;

            setSize({ width: validWidth, height: validHeight });
        }
    }, [loadedWidth, loadedHeight]);


    // Load visibility
    useEffect(() => {
        if (savedVisible == 2) {
            setVisible(2);
        } else if (savedVisible == 1) {
            setVisible(1);
        }
        else {
            setVisible(2); // default fallback if not defined
        }
    }, [savedVisible]);



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

        // Calculate aspect-ratio compatible minimums
        const originalAspectRatio = 330 / 80; // 4.125
        const baseMinWidth = 240;
        const baseMinHeight = 80;

        // Ensure minimums maintain aspect ratio
        const minWidth = Math.max(baseMinWidth, baseMinHeight * originalAspectRatio);
        const minHeight = Math.max(baseMinHeight, baseMinWidth / originalAspectRatio);

        const onMouseMove = (e: MouseEvent) => {
            if (dragging) {
                const dx = e.clientX - dragStart.current.x;
                const dy = e.clientY - dragStart.current.y;

                let newX = boxStart.current.x + dx;
                let newY = boxStart.current.y + dy;

                // Clamp position inside viewport
                newX = Math.min(Math.max(0, newX), window.innerWidth - size.width);
                newY = Math.min(Math.max(0, newY), window.innerHeight - size.height);

                setPosition({ x: newX, y: newY });
                trigger(mod.id, "SavePosition", newX, newY);

            } else if (resizing === 'bottom-right') {
                const dx = e.clientX - resizeStart.current.x;
                const dy = e.clientY - resizeStart.current.y;

                const aspectRatio = sizeStart.current.width / sizeStart.current.height;

                let proposedWidth = sizeStart.current.width + dx;
                let proposedHeight = sizeStart.current.height + dy;

                // Apply size limits
                const maxWidth = Math.min(MAX_WIDTH, window.innerWidth - posStart.current.x);
                const maxHeight = Math.min(MAX_HEIGHT, window.innerHeight - posStart.current.y);

                // Determine which dimension to follow based on mouse movement
                const widthDelta = Math.abs(dx);
                const heightDelta = Math.abs(dy);

                let finalWidth, finalHeight;

                if (widthDelta >= heightDelta) {
                    // Follow width, calculate height
                    finalWidth = Math.min(Math.max(proposedWidth, minWidth), maxWidth);
                    finalHeight = finalWidth / aspectRatio;

                    // If calculated height exceeds limits, adjust both
                    if (finalHeight > maxHeight) {
                        finalHeight = maxHeight;
                        finalWidth = finalHeight * aspectRatio;
                    } else if (finalHeight < minHeight) {
                        finalHeight = minHeight;
                        finalWidth = finalHeight * aspectRatio;
                    }
                } else {
                    // Follow height, calculate width
                    finalHeight = Math.min(Math.max(proposedHeight, minHeight), maxHeight);
                    finalWidth = finalHeight * aspectRatio;

                    // If calculated width exceeds limits, adjust both
                    if (finalWidth > maxWidth) {
                        finalWidth = maxWidth;
                        finalHeight = finalWidth / aspectRatio;
                    } else if (finalWidth < minWidth) {
                        finalWidth = minWidth;
                        finalHeight = finalWidth / aspectRatio;
                    }
                }

                // Final safety clamps
                finalWidth = Math.min(Math.max(finalWidth, minWidth), maxWidth);
                finalHeight = Math.min(Math.max(finalHeight, minHeight), maxHeight);

                setSize({ width: finalWidth, height: finalHeight });
                setPosition({ x: posStart.current.x, y: posStart.current.y });

                trigger(mod.id, "SaveSize", finalWidth, finalHeight);
                trigger(mod.id, "SavePosition", posStart.current.x, posStart.current.y);
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
    }, [dragging, resizing, size.width, size.height, position.x, position.y, MAX_WIDTH, MAX_HEIGHT]);


    // Safe number conversion with validation
    const safeMoneyPerHour = typeof moneyPerHour === 'number' ? moneyPerHour : 0;
    const safePopPerHour = typeof popPerHour === 'number' ? popPerHour : 0;
    const safeMonthlyBalance = typeof monthlyBalance === 'number' ? monthlyBalance : 0;

    const minFontSize = 2;
    const baseFontSize = 16;

    // Add safety checks for size calculations
    const safeWidth = Math.max(330, size.width || 330);
    const safeHeight = Math.max(80, size.height || 80);

    const scaleX = safeWidth / 330;
    const scaleY = safeHeight / 80;

    // Ensure avgScale is always valid
    const avgScale = Math.max(0.3, Math.min(3, (scaleX + scaleY) / 2));

    // Ensure fontSize is always valid
    const fontSize = Math.max(minFontSize, Math.min(100, baseFontSize * avgScale));


    // Default position and size constants (match your initial state)
    const defaultPosition = { x: (safeWindowWidth - 330) / 2, y: safeWindowHeight * 0.8 };
    const defaultSize = { width: 330, height: 80 };

    const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const onContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // If resizing or dragging, do nothing here to avoid conflicts
        if (dragging || resizing) return;

        // Start a timer to reset after 1 second hold
        resetTimeoutRef.current = setTimeout(() => {
            setPosition(defaultPosition);
            setSize(defaultSize);
            trigger(mod.id, "SavePosition", defaultPosition.x, defaultPosition.y);
            trigger(mod.id, "SaveSize", defaultSize.width, defaultSize.height);
        }, 2500);
    };

    const onContainerMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        // Cancel reset timer if mouse released before 1 second
        if (resetTimeoutRef.current) {
            clearTimeout(resetTimeoutRef.current);
            resetTimeoutRef.current = null;
        }
    };


    return (
        <>
            {/* Show Trends button */}
            {visible == 1 && safeWindowWidth > 0 && safeWindowHeight > 0 && (
                <button
                    onClick={() => {
                        setVisible(2);
                        trigger(mod.id, "SaveVis", 2);
                    }}
                    style={{
                        position: 'fixed',
                        left: Math.max(20, safeWindowWidth * 0.02) || 20,
                        bottom: Math.max(48, safeWindowHeight * 0.12) || 48,
                        width: Math.min(130, Math.max(100, safeWindowWidth * 0.08)) || 100,
                        height: Math.min(50, Math.max(35, safeWindowHeight * 0.04)) || 35,
                        transform: 'scale(1)',
                        transformOrigin: 'center center',
                        background: 'linear-gradient(135deg, rgba(0,15,30,0.9), rgba(15,0,30,0.9), rgba(0,15,30,0.9))',
                        border: '1px solid rgba(0,255,136,0.4)',
                        color: '#fff',
                        fontWeight: 'bold',
                        borderRadius: Math.min(10, Math.max(6, safeWindowWidth * 0.006)) || 8,
                        padding: `${Math.min(8, Math.max(4, safeWindowHeight * 0.005)) || 6}px ${Math.min(12, Math.max(8, safeWindowWidth * 0.008)) || 10}px`,
                        cursor: 'pointer',
                        zIndex: 999999,
                        fontSize: Math.min(16, Math.max(12, safeWindowWidth * 0.01)) || 14,
                        boxShadow: '0 0 8px rgba(0,255,136,0.2)',
                        backdropFilter: 'blur(6px)',
                        transition: 'transform 0.2s ease, background 0.2s ease',
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        display: 'inline-block',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,20,40,0.95), rgba(20,0,40,0.95), rgba(0,20,40,0.95))';
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,15,30,0.9), rgba(15,0,30,0.9), rgba(0,15,30,0.9))';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Show trends"
                >
                    Show Trends
                </button>
            )}

            {/* Main draggable container */}
            {visible == 2 && (
                <div
                    key={pulseKey}
                    onMouseDown={(e) => {
                        onMouseDown(e);       // drag start
                        onContainerMouseDown(e); // reset timer start
                    }}
                    onMouseUp={(e) => {
                        onContainerMouseUp(e); // cancel reset timer
                    }}
                    style={{
                        left: position.x,
                        top: position.y,
                        width: size.width,
                        height: size.height,
                        padding: `${12 * scaleY}px ${50 * scaleX}px ${12 * scaleY}px ${18 * scaleX}px`,
                        background: boxHovered
                            ? 'linear-gradient(135deg, rgba(0,20,40,0.95), rgba(20,0,40,0.95), rgba(0,20,40,0.95))'
                            : 'linear-gradient(135deg, rgba(0,15,30,0.9), rgba(15,0,30,0.9), rgba(0,15,30,0.9))',
                        color: 'white',
                        fontSize: `${fontSize}px`,
                        borderRadius: `${12 * avgScale}px`,
                        border: boxHovered
                            ? '2px solid rgba(0,255,136,0.6)'
                            : '2px solid rgba(255,255,255,0.2)',
                        zIndex: 999999,
                        minWidth: 110,
                        minHeight: 20,
                        maxWidth: '90vw',
                        maxHeight: '70vh',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: `${8 * scaleY}px`,
                        boxShadow: boxHovered
                            ? `0 0 ${20 * scaleY}px rgba(0,255,136,0.3), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`
                            : `0 0 ${15 * scaleY}px rgba(0,255,136,0.2), 0 6px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`,
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        backdropFilter: 'blur(10px)',
                        transition: dragging || resizing ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: boxHovered ? 'scale(1.02)' : 'scale(1)',
                        animation: 'pulse 0.6s ease-out',
                        cursor: dragging || resizing ? (dragging ? 'grabbing' : 'nwse-resize') : 'grab',
                        overflow: 'hidden',
                        position: 'fixed', // Important for absolute children
                    }}
                    onMouseEnter={() => setBoxHovered(true)}
                    onMouseLeave={() => setBoxHovered(false)}
                >
                    {/* Close Button */}
                    <button
                        onMouseDown={(e) => e.stopPropagation()} 
                        className="cs2-stats-close-btn"
                        onClick={e => {
                            e.stopPropagation();
                            setVisible(1);
                            trigger(mod.id, "SaveVis", 1);
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
                            width: 20 * scaleX,
                            height: 20 * scaleY,
                            cursor: 'pointer',
                            fontSize: fontSize * 0.9,
                            lineHeight: `${fontSize * 0.9}px`,
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
                            gap: `${8 * scaleY}px`,
                            flexGrow: 1,
                            overflow: 'auto',
                        }}
                    >
                        {/* Money Stats */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 * scaleX, flexWrap: 'wrap', minWidth: 0 }}>
                            <span style={{ fontWeight: 'bold', marginRight: 8 * scaleX, fontSize: fontSize * 0.9, color: 'white' }}>
                                Money:
                            </span>
                            <span className="stat-value" style={{
                                color: getColor(safeMoneyPerHour),
                                fontWeight: 600,
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
                                fontSize: fontSize,
                            }}>
                                {formatSignedMoney(safeMonthlyBalance)}
                            </span>
                            <span style={{ color: getColor(safeMonthlyBalance), opacity: 0.8, fontSize: fontSize * 0.85 }}>
                                /m
                            </span>
                        </div>

                        {/* Population Stats */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 * scaleX, flexWrap: 'wrap', minWidth: 0 }}>
                            <span style={{ fontWeight: 'bold', marginRight: 8 * scaleX, fontSize: fontSize * 0.9, color: 'white' }}>
                                Pop:
                            </span>
                            <span className="stat-value" style={{
                                color: getColor(safePopPerHour),
                                fontWeight: 600,
                                fontSize: fontSize,
                            }}>
                                {formatSignedPop(safePopPerHour)}
                            </span>
                            <span style={{ color: getColor(safePopPerHour), opacity: 0.8, fontSize: fontSize * 0.85 }}>
                                /h
                            </span>
                        </div>
                    </div>

                    {/* Resize Handle */}
                    {/* Resize Handle */}
                    <div
                        className="resize-handle resize-handle-bottom-right resize-handle-corner"
                        style={{
                            width: 16 * scaleX,
                            height: 16 * scaleY,
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            cursor: 'nwse-resize',
                            zIndex: 10000,
                            background: 'transparent',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'flex-end',
                            padding: '2px',
                        }}
                        onMouseDown={e => {
                            e.stopPropagation();
                            onResizeMouseDown(e, 'bottom-right');
                        }}
                    >
                        {/* Visual resize grip */}
                        <div
                            style={{
                                width: Math.max(8, 12 * Math.min(scaleX, scaleY)),
                                height: Math.max(8, 12 * Math.min(scaleX, scaleY)),
                                background: `
                linear-gradient(135deg, transparent 46%, rgba(255,255,255,0.3) 49%, rgba(255,255,255,0.3) 51%, transparent 54%),
                linear-gradient(135deg, transparent 36%, rgba(255,255,255,0.2) 39%, rgba(255,255,255,0.2) 41%, transparent 44%),
                linear-gradient(135deg, transparent 26%, rgba(255,255,255,0.1) 29%, rgba(255,255,255,0.1) 31%, transparent 34%)
            `,
                                borderRadius: '0 0 8px 0',
                                opacity: boxHovered ? 0.8 : 0.4,
                                transition: 'opacity 0.2s ease',
                                pointerEvents: 'none',
                            }}
                        />
                    </div>
                </div>
            )}
        </>
    );
};
