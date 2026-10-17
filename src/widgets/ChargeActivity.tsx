import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { activityBackgroundTint, font, foregroundStyle, lineLimit, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

/**
 * iPhone: the upcoming charge on the lock screen and in the Dynamic Island.
 * Everything inside the 'widget' function runs in a separate tiny runtime:
 * no imports from the app, no hooks, only props and SwiftUI components.
 */
export type ChargeActivityProps = {
  /** which subscription it is about; the layout itself does not show it */
  subId: string;
  name: string;
  /** already formatted, e.g. "449 ₴" */
  amount: string;
  /** "today" or "tomorrow" */
  when: 'today' | 'tomorrow';
  /** start of the charge day, ms since epoch */
  chargeAt: number;
  /** service colour, #RRGGBB */
  color: string;
};

const ChargeActivity = (props: ChargeActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const tomorrow = props.when === 'tomorrow';
  const dim = environment.isLuminanceReduced ? '#8E94B3' : '#B8BEDB';
  const title = props.name + ' спише ' + props.amount;
  const hint = tomorrow ? 'Завтра. Натисніть, щоб продовжити або скасувати' : 'Сьогодні. Ще можна встигнути скасувати';
  const icon = (size: number) => <Image systemName="creditcard.fill" size={size} color={props.color} />;

  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ all: 16 }), activityBackgroundTint('#10132A')]}>
        {icon(30)}
        <VStack alignment="leading" spacing={3}>
          <Text modifiers={[font({ weight: 'semibold', size: 17 }), foregroundStyle('#FFFFFF'), lineLimit(1)]}>{title}</Text>
          <Text modifiers={[font({ size: 14 }), foregroundStyle(dim), lineLimit(2)]}>{hint}</Text>
        </VStack>
        <Spacer />
        {tomorrow ? (
          <Text
            date={new Date(props.chargeAt)}
            dateStyle="relative"
            modifiers={[font({ weight: 'semibold', size: 15 }), foregroundStyle('#FFB938')]}
          />
        ) : (
          <Text modifiers={[font({ weight: 'semibold', size: 15 }), foregroundStyle('#FFB938')]}>сьогодні</Text>
        )}
      </HStack>
    ),
    compactLeading: icon(16),
    compactTrailing: (
      <Text modifiers={[font({ weight: 'semibold', size: 14 }), foregroundStyle('#FFB938')]}>{props.amount}</Text>
    ),
    minimal: icon(16),
    expandedLeading: (
      <HStack spacing={8} modifiers={[padding({ leading: 6 })]}>
        {icon(24)}
        <Text modifiers={[font({ weight: 'semibold', size: 16 }), lineLimit(1)]}>{props.name}</Text>
      </HStack>
    ),
    expandedTrailing: (
      <Text modifiers={[font({ weight: 'bold', size: 18 }), foregroundStyle('#FFB938'), padding({ trailing: 6 })]}>
        {props.amount}
      </Text>
    ),
    expandedBottom: (
      <Text modifiers={[font({ size: 14 }), foregroundStyle('#B8BEDB'), padding({ horizontal: 6, bottom: 4 })]}>
        {hint}
      </Text>
    ),
  };
};

export default createLiveActivity('ChargeActivity', ChargeActivity);
