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
        x: (safeWindowWidth - 300) / 2,
        y: safeWindowHeight * 0.8,
    });

    // Resizable box state (size)
    const [size, setSize] = useState({
        width: 300,
        height: 80,
    });

    // Dragging state for moving window
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const boxStart = useRef({ x: 0, y: 0 });

    const hovering = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Resizing state
    const [resizing, setResizing] = useState<null | string>(null);
    const resizeStart = useRef({ x: 0, y: 0 });
    const sizeStart = useRef({ width: 0, height: 0 });
    const posStart = useRef({ x: 0, y: 0 });

    const contentRef = useRef<HTMLDivElement>(null);

    // Show/hide state
    const [visible, setVisible] = useState(2);

    // Hover state for main box
    const [boxHovered, setBoxHovered] = useState(false);

    // Animation state
    const [pulseKey, setPulseKey] = useState(0);

    // Add this after your other useState declarations
    const [manuallyResized, setManuallyResized] = useState(false);

    // Tooltip state
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipTimeoutRef = useRef<number | null>(null);

    // Add this with your other useState declarations
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

    useEffect(() => {
        if (!showTooltip) return;

        function handleWindowMouseMove(e: MouseEvent) {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            // If mouse is outside the container, hide tooltip
            if (
                e.clientX < rect.left ||
                e.clientX > rect.right ||
                e.clientY < rect.top ||
                e.clientY > rect.bottom
            ) {
                hovering.current = false;
                setShowTooltip(false);
                if (tooltipTimeoutRef.current) {
                    clearTimeout(tooltipTimeoutRef.current);
                    tooltipTimeoutRef.current = null;
                }
            }
        }

        window.addEventListener('mousemove', handleWindowMouseMove);
        return () => window.removeEventListener('mousemove', handleWindowMouseMove);
    }, [showTooltip]);


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
    // Load saved size on mount with validation
    useEffect(() => {
        if (typeof loadedWidth === 'number' && typeof loadedHeight === 'number') {

            // Validate the loaded values before using them
            const validWidth = loadedWidth > 0 && loadedWidth >= 180 ? loadedWidth : 300;
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


    useEffect(() => {
        // Skip auto-sizing if user has manually resized, currently resizing, or dragging
        if (resizing || manuallyResized || dragging || !contentRef.current) return;

        const contentWidth = contentRef.current.scrollWidth;
        const horizontalPadding = 68; // Fixed padding: 50 (right) + 18 (left)

        // Dynamic minimum width based on content - much more responsive
        const baseMinWidth = 180; // Much smaller base minimum
        const contentBasedMinWidth = contentWidth + horizontalPadding + 20; // Just enough for content
        const minWidth = Math.max(baseMinWidth, contentBasedMinWidth);

        const maxWidth = 450; // Maximum width for longest possible numbers

        // Calculate width based on actual content needs
        const calculatedWidth = Math.min(Math.max(minWidth, contentWidth + horizontalPadding + 30), maxWidth);
        const fixedHeight = 120; // Fixed height to prevent growth

        // Update width more conservatively to prevent glitches during interaction
        if (Math.abs(calculatedWidth - size.width) > 12) { // Increased threshold to reduce conflicts
            setSize(prev => ({
                width: calculatedWidth,
                height: fixedHeight
            }));
            trigger(mod.id, "SaveSize", calculatedWidth, fixedHeight);
        }
    }, [moneyPerHour, monthlyBalance, popPerHour, resizing, manuallyResized, dragging]);


    // Drag window handlers
    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (resizing) return;

        // Clear reset timer immediately when starting to drag
        if (resetTimeoutRef.current) {
            clearTimeout(resetTimeoutRef.current);
            resetTimeoutRef.current = null;
        }

        // Check if click is in resize handle area (bottom-right 20px for better detection)
        const rect = e.currentTarget.getBoundingClientRect();
        const isInResizeArea = (
            e.clientX > rect.right - 20 &&
            e.clientY > rect.bottom - 20
        );

        if (isInResizeArea) return; // Don't start dragging if in resize area

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

        // Clear reset timer immediately when starting to resize
        if (resetTimeoutRef.current) {
            clearTimeout(resetTimeoutRef.current);
            resetTimeoutRef.current = null;
        }

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

                // Use consistent viewport dimensions and ensure proper boundaries
                const viewportWidth = safeWindowWidth;
                const viewportHeight = safeWindowHeight;
                const containerWidth = size.width;
                const containerHeight = size.height;

                // Clamp position inside viewport with proper boundaries
                newX = Math.min(Math.max(0, newX), Math.max(0, viewportWidth - containerWidth));
                newY = Math.min(Math.max(0, newY), Math.max(0, viewportHeight - containerHeight));

                setPosition({ x: newX, y: newY });
                trigger(mod.id, "SavePosition", newX, newY);

            } else if (resizing === 'bottom-right') {
                const dx = e.clientX - resizeStart.current.x;
                const dy = e.clientY - resizeStart.current.y;

                // Calculate original aspect ratio
                const aspectRatio = sizeStart.current.width / sizeStart.current.height;

                // Determine which dimension to follow based on mouse movement
                const widthDelta = Math.abs(dx);
                const heightDelta = Math.abs(dy);

                let newWidth, newHeight;

                // Follow the dimension with larger movement to make resizing feel natural
                if (widthDelta >= heightDelta) {
                    // Follow width, calculate height to maintain aspect ratio
                    newWidth = sizeStart.current.width + dx;
                    newHeight = newWidth / aspectRatio;
                } else {
                    // Follow height, calculate width to maintain aspect ratio
                    newHeight = sizeStart.current.height + dy;
                    newWidth = newHeight * aspectRatio;
                }

                // Apply constraints while maintaining aspect ratio
                const minWidth = 180;
                const minHeight = 80;
                const maxWidth = Math.min(MAX_WIDTH, safeWindowWidth - posStart.current.x);
                const maxHeight = Math.min(MAX_HEIGHT, safeWindowHeight - posStart.current.y);

                // Ensure minimums are met while maintaining aspect ratio
                if (newWidth < minWidth) {
                    newWidth = minWidth;
                    newHeight = newWidth / aspectRatio;
                }
                if (newHeight < minHeight) {
                    newHeight = minHeight;
                    newWidth = newHeight * aspectRatio;
                }

                // Ensure maximums are not exceeded while maintaining aspect ratio
                if (newWidth > maxWidth) {
                    newWidth = maxWidth;
                    newHeight = newWidth / aspectRatio;
                }
                if (newHeight > maxHeight) {
                    newHeight = maxHeight;
                    newWidth = newHeight * aspectRatio;
                }

                setSize({ width: newWidth, height: newHeight });
                setManuallyResized(true); // Mark as manually resized
                trigger(mod.id, "SaveSize", newWidth, newHeight);
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
    }, [dragging, resizing, size.width, size.height, position.x, position.y, MAX_WIDTH, MAX_HEIGHT, safeWindowWidth, safeWindowHeight]);


    // Safe number conversion with validation
    const safeMoneyPerHour = typeof moneyPerHour === 'number' ? moneyPerHour : 0;
    const safePopPerHour = typeof popPerHour === 'number' ? popPerHour : 0;
    const safeMonthlyBalance = typeof monthlyBalance === 'number' ? monthlyBalance : 0;

    // Add safety checks for size calculations with proper validation
    const safeWidth = Math.max(180, Number.isFinite(size.width) ? size.width : 180);
    const safeHeight = Math.max(80, Number.isFinite(size.height) ? size.height : 80);

    // Dynamic font scaling based on container size
    const minFontSize = 8;  // Minimum readable size
    const maxFontSize = 50; // Maximum size
    const baseFontSize = 20;

    // Calculate scale factors more aggressively
    // Calculate scale factors based on current container size
    const scaleX = Number.isFinite(safeWidth / 380) ? safeWidth / 380 : 1; // Use 380 as new base width
    const scaleY = Number.isFinite(safeHeight / 120) ? safeHeight / 120 : 1; // Use 120 as new base height

    // Use average of both scales for more balanced scaling
    const averageScale = (scaleX + scaleY) / 2;
    const constrainingScale = Math.max(0.5, Math.min(2, averageScale)); // Clamp between 0.5x and 2x

    // Calculate optimal font size with balanced scaling
    const optimalFontSize = baseFontSize * constrainingScale;

    // Ensure fontSize is within readable bounds
    const fontSize = Math.max(minFontSize, Math.min(maxFontSize, Number.isFinite(optimalFontSize) ? optimalFontSize : baseFontSize));

    // Calculate responsive spacing based on constraining scale
    const responsiveScale = constrainingScale;


    // Default position and size constants (match your initial state)
    const defaultPosition = { x: (safeWindowWidth - 300) / 2, y: safeWindowHeight * 0.8 };
    const defaultSize = { width: 300, height: 80 }; // Consistent with initial state

    const resetTimeoutRef = useRef<number | null>(null);

    const onContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // If resizing or dragging, do nothing here to avoid conflicts
        if (dragging || resizing) return;

        // Check if click is in resize handle area to prevent reset timer
        const rect = e.currentTarget.getBoundingClientRect();
        const isInResizeArea = (
            e.clientX > rect.right - 20 &&
            e.clientY > rect.bottom - 20
        );

        if (isInResizeArea) return; // Don't start reset timer if in resize area

        // Start a timer to reset after 2.5 second hold - but only if we're not about to start dragging
        resetTimeoutRef.current = setTimeout(() => {
            // Double-check we're not dragging or resizing before resetting
            if (!dragging && !resizing) {
                setPosition(defaultPosition);
                setSize(defaultSize);
                trigger(mod.id, "SavePosition", defaultPosition.x, defaultPosition.y);
                trigger(mod.id, "SaveSize", defaultSize.width, defaultSize.height);
            }
        }, 2500) as number;
    };

    const onContainerMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        // Cancel reset timer if mouse released
        if (resetTimeoutRef.current) {
            clearTimeout(resetTimeoutRef.current);
            resetTimeoutRef.current = null;
        }
    };


    return (
        <>
            <style>
                {`
            @keyframes fadeIn {
                from { opacity: 0; transform: translateX(-50%) translateY(4px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `}
            </style>


            {/* Show Trends button */}
            {visible == 1 && safeWindowWidth > 0 && safeWindowHeight > 0 && (
                <button
                    onClick={() => {
                        setVisible(2);
                        trigger(mod.id, "SaveVis", 2);
                    }}
                    style={{
                        position: 'fixed',
                        left: Math.max(20, Number.isFinite(safeWindowWidth * 0.02) ? safeWindowWidth * 0.02 : 20),
                        bottom: Math.max(48, Number.isFinite(safeWindowHeight * 0.12) ? safeWindowHeight * 0.12 : 48),
                        width: Math.max(100, Math.min(130, Number.isFinite(safeWindowWidth * 0.08) ? safeWindowWidth * 0.08 : 100)),
                        height: Math.max(35, Math.min(50, Number.isFinite(safeWindowHeight * 0.04) ? safeWindowHeight * 0.04 : 35)),
                        transform: 'scale(1)',
                        transformOrigin: 'center center',
                        background: 'linear-gradient(135deg, rgba(0,15,30,0.9), rgba(15,0,30,0.9), rgba(0,15,30,0.9))',
                        border: '1px solid rgba(0,255,136,0.4)',
                        color: '#fff',
                        fontWeight: 'bold',
                        borderRadius: Math.max(6, Math.min(10, Number.isFinite(safeWindowWidth * 0.006) ? safeWindowWidth * 0.006 : 8)),
                        padding: 0, // Remove padding to let flex handle centering
                        cursor: 'pointer',
                        zIndex: 999999,
                        fontSize: Math.max(12, Math.min(16, Number.isFinite(safeWindowWidth * 0.01) ? safeWindowWidth * 0.01 : 14)),
                        boxShadow: '0 0 8px rgba(0,255,136,0.2)',
                        backdropFilter: 'blur(6px)',
                        transition: 'transform 0.2s ease, background 0.2s ease',
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        display: 'flex', // Changed to flex
                        alignItems: 'center', // Vertical centering
                        justifyContent: 'center', // Horizontal centering
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
                    ref={containerRef}
                    key={pulseKey}
                    onMouseDown={(e) => {
                        onMouseDown(e);
                        onContainerMouseDown(e);
                    }}
                    onMouseUp={(e) => {
                        onContainerMouseUp(e);
                    }}
                    style={{
                        left: position.x,
                        top: position.y,
                        width: size.width,
                        height: size.height,
                        padding: `${Number.isFinite(12 * responsiveScale) ? 12 * responsiveScale : 12}px ${Number.isFinite(50 * responsiveScale) ? 50 * responsiveScale : 50}px ${Number.isFinite(12 * responsiveScale) ? 12 * responsiveScale : 12}px ${Number.isFinite(18 * responsiveScale) ? 18 * responsiveScale : 18}px`,
                        background: boxHovered
                            ? 'linear-gradient(135deg, rgba(0,20,40,0.95), rgba(20,0,40,0.95), rgba(0,20,40,0.95))'
                            : 'linear-gradient(135deg, rgba(0,15,30,0.9), rgba(15,0,30,0.9), rgba(0,15,30,0.9))',
                        color: 'white',
                        fontSize: `${fontSize}px`,
                        borderRadius: `${Number.isFinite(12 * responsiveScale) ? 12 * responsiveScale : 12}px`,
                        border: boxHovered
                            ? '2px solid rgba(0,255,136,0.6)'
                            : '2px solid rgba(255,255,255,0.2)',
                        zIndex: 999999,
                        // Add validation for the main container minWidth
                        minWidth: Number.isFinite(110) && 110 > 0 ? 110 : 110,
                        minHeight: Number.isFinite(20) && 20 > 0 ? 20 : 20,
                        maxWidth: '90vw',
                        maxHeight: '70vh',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: `${Number.isFinite(8 * responsiveScale) ? 8 * responsiveScale : 8}px`,
                        boxShadow: boxHovered
                            ? `0 0 ${Number.isFinite(20 * responsiveScale) ? 20 * responsiveScale : 20}px rgba(0,255,136,0.3), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`
                            : `0 0 ${Number.isFinite(15 * responsiveScale) ? 15 * responsiveScale : 15}px rgba(0,255,136,0.2), 0 6px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`,
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        backdropFilter: 'blur(10px)',
                        transition: dragging || resizing ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: boxHovered ? 'scale(1.02)' : 'scale(1)',
                        animation: 'pulse 0.6s ease-out',
                        cursor: dragging || resizing ? (dragging ? 'grabbing' : 'nwse-resize') : 'grab',
                        overflow: showTooltip ? 'visible' : 'hidden',
                        position: 'fixed',
                    }}
                    onMouseEnter={(e) => {
                        hovering.current = true;
                        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
                        tooltipTimeoutRef.current = setTimeout(() => {
                            if (hovering.current) setShowTooltip(true);
                        }, 1000);
                    }}
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMousePos({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                        });
                    }}
                    onMouseLeave={() => {
                        hovering.current = false;
                        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
                        setShowTooltip(false);
                    }}
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
                            width: Number.isFinite(20 * responsiveScale) ? 20 * responsiveScale : 20,
                            height: Number.isFinite(20 * responsiveScale) ? 20 * responsiveScale : 20,
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

                    {/* Tooltip - positioned at mouse location */}
                    {showTooltip && (
                        <div
                            style={{
                                position: 'absolute',
                                left: mousePos.x + 12, // 12px to the left of the cursor
                                top: mousePos.y + 28,  // 28px above the cursor (18px gap + ~10px for tooltip height)
                                background: 'rgba(0, 0, 0, 0.9)',
                                color: 'white',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontSize: Math.max(11, Math.min(14, fontSize * 0.8)),
                                whiteSpace: 'nowrap',
                                zIndex: 1000000,
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                backdropFilter: 'blur(4px)',
                                animation: 'fadeIn 0.2s ease-out',
                                pointerEvents: 'none',
                            }}
                        >
                            Drag to move - Hold 2.5s to reset - Drag bottom-right corner to resize
                        </div>
                    )}
                    {/* Stats content */}
                    <div
                        ref={contentRef}
                        onMouseEnter={(e) => e.stopPropagation()}
                        onMouseLeave={(e) => e.stopPropagation()}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: `${Number.isFinite(8 * responsiveScale) ? 8 * responsiveScale : 8}px`,
                            flexGrow: 1,
                            overflow: 'visible',
                            minHeight: Number.isFinite(20) ? 20 : 20,
                            width: '100%',
                        }}
                    >
                        {/* Money Stats */}
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            gap: Number.isFinite(6 * responsiveScale) ? 6 * responsiveScale : 6,
                            flexWrap: 'nowrap',
                            // Removed minWidth: 'max-content' - this was likely causing the error
                            whiteSpace: 'nowrap'
                        }}>
                            <span style={{ fontWeight: 'bold', marginRight: Number.isFinite(8 * responsiveScale) ? 8 * responsiveScale : 8, fontSize: Number.isFinite(fontSize * 0.9) ? fontSize * 0.9 : 14, color: 'white' }}>
                                Money:
                            </span>
                            <span className="stat-value" style={{
                                color: getColor(safeMoneyPerHour),
                                fontWeight: 600,
                                fontSize: Number.isFinite(fontSize) ? fontSize : 16,
                            }}>
                                {formatSignedMoney(safeMoneyPerHour)}
                            </span>
                            <span style={{ color: getColor(safeMoneyPerHour), opacity: 0.8, fontSize: Number.isFinite(fontSize * 0.85) ? fontSize * 0.85 : 14 }}>
                                /h,&nbsp;
                            </span>
                            <span className="stat-value" style={{
                                color: getColor(safeMonthlyBalance),
                                fontWeight: 600,
                                fontSize: Number.isFinite(fontSize) ? fontSize : 16,
                            }}>
                                {formatSignedMoney(safeMonthlyBalance)}
                            </span>
                            <span style={{ color: getColor(safeMonthlyBalance), opacity: 0.8, fontSize: Number.isFinite(fontSize * 0.85) ? fontSize * 0.85 : 14 }}>
                                /m
                            </span>
                        </div>

                        {/* Population Stats */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: Number.isFinite(6 * responsiveScale) ? 6 * responsiveScale : 6, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 'bold', marginRight: Number.isFinite(8 * responsiveScale) ? 8 * responsiveScale : 8, fontSize: Number.isFinite(fontSize * 0.9) ? fontSize * 0.9 : 14, color: 'white' }}>
                                Pop:
                            </span>
                            <span className="stat-value" style={{
                                color: getColor(safePopPerHour),
                                fontWeight: 600,
                                fontSize: Number.isFinite(fontSize) ? fontSize : 16,
                            }}>
                                {formatSignedPop(safePopPerHour)}
                            </span>
                            <span style={{ color: getColor(safePopPerHour), opacity: 0.8, fontSize: Number.isFinite(fontSize * 0.85) ? fontSize * 0.85 : 14 }}>
                                /h
                            </span>
                        </div>
                    </div>

                    {/* Resize Handle */}
                    <div
                        className="resize-handle resize-handle-bottom-right resize-handle-corner"
                        style={{
                            width: Number.isFinite(16 * responsiveScale) ? 16 * responsiveScale : 16,
                            height: Number.isFinite(16 * responsiveScale) ? 16 * responsiveScale : 16,
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
                        onMouseEnter={(e) => e.stopPropagation()}
                        onMouseLeave={(e) => e.stopPropagation()}
                        onMouseDown={e => {
                            e.stopPropagation();
                            onResizeMouseDown(e, 'bottom-right');
                        }}
                    >
                        {/* Visual resize grip */}
                        <div
                            style={{
                                width: Math.max(10, Number.isFinite(14 * responsiveScale) ? 14 * responsiveScale : 14),
                                height: Math.max(10, Number.isFinite(14 * responsiveScale) ? 14 * responsiveScale : 14),
                                background: `
            linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.8) 35%, rgba(255,255,255,0.8) 40%, transparent 45%),
            linear-gradient(135deg, transparent 45%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.6) 55%, transparent 60%),
            linear-gradient(135deg, transparent 60%, rgba(255,255,255,0.4) 65%, rgba(255,255,255,0.4) 70%, transparent 75%)
        `,
                                borderRadius: '0 0 8px 0',
                                opacity: boxHovered ? 1 : 0.7,
                                transition: 'opacity 0.2s ease, transform 0.2s ease',
                                pointerEvents: 'none',
                                transform: boxHovered ? 'scale(1.1)' : 'scale(1)',
                            }}
                        />
                    </div>
                </div>
            )}
        </>
    );
};
