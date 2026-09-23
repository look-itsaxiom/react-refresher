export type Task = { id: string; title: string; dependsOn: string[] };

export const tasks: Task[] = [
  { id: 't1', title: 'Design PCB', dependsOn: [] },
  { id: 't2', title: 'Order components', dependsOn: ['t1'] },
  { id: 't3', title: 'Assemble board', dependsOn: ['t2'] },
  { id: 't4', title: 'Write firmware', dependsOn: [] },
  { id: 't5', title: 'Flash firmware', dependsOn: ['t3', 't4'] },
];

export const done = new Set<string>(['t1']);
