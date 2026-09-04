export type GreetingPeriod = 'dawn' | 'morning' | 'afternoon' | 'night';

const greetingsByPeriod: Record<GreetingPeriod, string[]> = {
  dawn: ['Boa noite', 'Uma boa madrugada', 'Ainda por aqui?'],
  morning: ['Bom dia', 'Uma ótima manhã', 'Vamos começar o dia?'],
  afternoon: ['Boa tarde', 'Uma ótima tarde', 'Como está sua tarde?'],
  night: ['Boa noite', 'Uma ótima noite', 'Encerrando mais um dia?'],
};

export const getGreetingPeriod = (date: Date = new Date()): GreetingPeriod => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18) return 'night';
  return 'dawn';
};

export const getGreetingForDate = (date: Date = new Date()) => {
  const period = getGreetingPeriod(date);
  const options = greetingsByPeriod[period];
  const daySeed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const periodSeed = period === 'dawn' ? 0 : period === 'morning' ? 1 : period === 'afternoon' ? 2 : 3;
  return options[(daySeed + periodSeed) % options.length];
};
