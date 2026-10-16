export type BankId = 'monobank' | 'privat' | 'other';

export interface Bank {
  id: BankId;
  name: string;
  color: string;
  hint: string;
  /** how to get a statement file out of the bank app */
  fileSteps: string[];
  /** a shortcut that works from a computer, if there is one */
  desktopTip?: string;
}

export const BANKS: Bank[] = [
  {
    id: 'monobank',
    name: 'monobank',
    color: '#3A3A42',
    hint: 'Сам підтягне виписку через токен',
    fileSteps: [
      'Відкрийте картку в застосунку monobank і знайдіть виписку',
      'Оберіть період 3 місяці й формат CSV або Excel',
      'Збережіть файл на телефон і натисніть «Обрати файл»',
    ],
  },
  {
    id: 'privat',
    name: 'ПриватБанк',
    color: '#5CA614',
    hint: 'Файл виписки з Приват24',
    fileSteps: [
      'Відкрийте Приват24 і виберіть картку, з якої платите за підписки',
      'Сформуйте виписку за останні 3 місяці',
      'Оберіть формат Excel або CSV і збережіть файл на телефон',
      'Поверніться сюди й натисніть «Обрати файл»',
    ],
    desktopTip:
      'З компʼютера ще простіше: privat24.ua, «Мої рахунки», виписка по картці, значок Excel. Файл можна перекинути собі в месенджер.',
  },
  {
    id: 'other',
    name: 'Інший банк',
    color: '#5B6178',
    hint: 'ПУМБ, Ощад, А-Банк, Sense та інші',
    fileSteps: [
      'У застосунку банку знайдіть виписку по картці',
      'Оберіть період 3 місяці й формат Excel або CSV',
      'Збережіть файл на телефон і натисніть «Обрати файл»',
    ],
  },
];

export const findBank = (id: BankId) => BANKS.find((b) => b.id === id)!;
