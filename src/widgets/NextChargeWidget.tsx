import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, lineLimit, minimumScaleFactor, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

/**
 * iPhone widget: the next charge and the monthly total.
 * Home screen (small) and lock screen (rectangular and inline).
 */
export type NextChargeProps = {
  /** e.g. "Netflix", empty when nothing is active */
  name: string;
  amount: string;
  /** "сьогодні", "завтра", "через 5 днів", "17 листопада" */
  when: string;
  /** e.g. "2 314 ₴ на місяць" */
  monthly: string;
  color: string;
  /** id of the subscription, for the tap */
  subId: string;
};

const NextChargeWidget = (props: NextChargeProps, environment: WidgetEnvironment) => {
  'widget';
  const family = environment.widgetFamily;
  const empty = props.name === '';
  const url = empty ? 'subcontrol://' : 'subcontrol://sub/' + props.subId;
  const soon = props.when === 'сьогодні' || props.when === 'завтра';
  const whenColor = soon ? '#E89A0C' : '#7D8399';

  if (family === 'accessoryInline') {
    return (
      <Text modifiers={[widgetURL(url)]}>{empty ? 'SubControl: підписок немає' : props.name + ' ' + props.when + ', ' + props.amount}</Text>
    );
  }

  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={1} modifiers={[widgetURL(url), containerBackground('clear', 'widget')]}>
        <HStack spacing={4}>
          <Image systemName="creditcard.fill" size={12} />
          <Text modifiers={[font({ weight: 'semibold', size: 13 })]}>{empty ? 'SubControl' : props.when}</Text>
        </HStack>
        <Text modifiers={[font({ weight: 'bold', size: 15 }), lineLimit(1), minimumScaleFactor(0.7)]}>
          {empty ? 'Підписок немає' : props.name}
        </Text>
        <Text modifiers={[font({ size: 13 }), lineLimit(1)]}>{empty ? props.monthly : props.amount}</Text>
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={4} modifiers={[widgetURL(url), containerBackground('#FFFFFF', 'widget')]}>
      <HStack>
        <Image systemName="creditcard.fill" size={20} color={empty ? '#2F4BFF' : props.color} />
        <Spacer />
        <Text modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle(whenColor)]}>{empty ? '' : props.when}</Text>
      </HStack>
      <Spacer />
      <Text modifiers={[font({ weight: 'semibold', size: 15 }), foregroundStyle('#1B2140'), lineLimit(1), minimumScaleFactor(0.7)]}>
        {empty ? 'Підписок немає' : props.name}
      </Text>
      <Text modifiers={[font({ weight: 'bold', size: 22 }), foregroundStyle('#1B2140'), lineLimit(1), minimumScaleFactor(0.6)]}>
        {empty ? '0 ₴' : props.amount}
      </Text>
      <Text modifiers={[font({ size: 11 }), foregroundStyle('#7D8399'), lineLimit(1)]}>{props.monthly}</Text>
    </VStack>
  );
};

export default createWidget('NextCharge', NextChargeWidget, {
  name: '',
  amount: '',
  when: '',
  monthly: 'Відкрийте SubControl',
  color: '#2F4BFF',
  subId: '',
});
