import { Platform, Switch } from 'react-native';

import { feedback } from '../lib/feedback';
import { usePalette } from '../theme';

interface Props {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

/** On/off switch in the app's colours on every platform. */
export function Toggle({ value, onChange, label }: Props) {
  const p = usePalette();
  const webColors =
    Platform.OS === 'web' ? ({ activeThumbColor: '#FFFFFF', activeTrackColor: p.cobalt } as object) : {};
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        onChange(v);
        feedback(v ? 'on' : 'off');
      }}
      trackColor={{ true: p.cobalt, false: p.track }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={p.track}
      accessibilityLabel={label}
      {...webColors}
    />
  );
}
