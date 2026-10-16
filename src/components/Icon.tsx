import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'plus' | 'close' | 'chevronRight' | 'chevronLeft' | 'arrowLeft' | 'sliders' | 'bell'
  | 'check' | 'external' | 'search' | 'bolt' | 'users' | 'trash' | 'lock' | 'calendar'
  | 'card' | 'star' | 'refresh' | 'shield' | 'edit' | 'download';

interface Props {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

/** A small hand-drawn icon set — no icon fonts to load, crisp at any size. */
export function Icon({ name, size = 22, color, strokeWidth = 2 }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render(name, common)}
    </Svg>
  );
}

function render(name: IconName, c: Record<string, unknown>) {
  switch (name) {
    case 'plus':
      return <Path d="M12 5v14M5 12h14" {...c} />;
    case 'close':
      return <Path d="M6 6l12 12M18 6L6 18" {...c} />;
    case 'chevronRight':
      return <Path d="M9 6l6 6-6 6" {...c} />;
    case 'chevronLeft':
      return <Path d="M15 6l-6 6 6 6" {...c} />;
    case 'arrowLeft':
      return <Path d="M19 12H5M11 6l-6 6 6 6" {...c} />;
    case 'sliders':
      return (
        <>
          <Path d="M4 7h9M19 7h1M4 17h3M13 17h7" {...c} />
          <Circle cx={16} cy={7} r={2.5} {...c} />
          <Circle cx={10} cy={17} r={2.5} {...c} />
        </>
      );
    case 'bell':
      return <Path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 0 0 4 0" {...c} />;
    case 'check':
      return <Path d="M5 12.5l4.5 4.5L19 7.5" {...c} />;
    case 'external':
      return <Path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" {...c} />;
    case 'search':
      return (
        <>
          <Circle cx={11} cy={11} r={6.5} {...c} />
          <Path d="M20 20l-4.3-4.3" {...c} />
        </>
      );
    case 'bolt':
      return <Path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" {...c} />;
    case 'users':
      return (
        <>
          <Circle cx={9} cy={8} r={3.5} {...c} />
          <Path d="M3 19.5c0-3 2.7-5 6-5s6 2 6 5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.7 2.5 2.4 2.5 4.7" {...c} />
        </>
      );
    case 'trash':
      return <Path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13" {...c} />;
    case 'lock':
      return (
        <>
          <Rect x={5} y={11} width={14} height={9} rx={2} {...c} />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" {...c} />
        </>
      );
    case 'calendar':
      return (
        <>
          <Rect x={4} y={5} width={16} height={15} rx={2.5} {...c} />
          <Path d="M4 10h16M9 3v4M15 3v4" {...c} />
        </>
      );
    case 'card':
      return (
        <>
          <Rect x={3} y={6} width={18} height={13} rx={2.5} {...c} />
          <Path d="M3 10.5h18M7 15h4" {...c} />
        </>
      );
    case 'star':
      return <Path d="M12 3.5l2.5 5.4 5.9.7-4.4 4 1.2 5.8L12 16.5l-5.2 2.9L8 13.6l-4.4-4 5.9-.7L12 3.5z" {...c} />;
    case 'refresh':
      return <Path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5" {...c} />;
    case 'shield':
      return <Path d="M12 3l7 3v5.5c0 4.3-3 7.8-7 9.5-4-1.7-7-5.2-7-9.5V6l7-3z" {...c} />;
    case 'edit':
      return <Path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" {...c} />;
    case 'download':
      return <Path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" {...c} />;
  }
}
