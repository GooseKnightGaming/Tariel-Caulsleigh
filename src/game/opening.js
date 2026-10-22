// TARIEL CAULSLEIGH - Chapter One opens: the hill above Stanlech, morning mist.
// Lord Caulsleigh, First Sergeant Síofel and Tariel look down on the town; the mission; the rider; the parting.
// The lines are drafts for Rhys to rewrite. A step is { who, line } or { do: fn-name }.

export const CAST = {
  tariel: { name: 'Tariel', tint: [0.36, 0.30, 0.24] },
  caulsleigh: { name: 'Lord Caulsleigh', tint: [0.20, 0.24, 0.40] },
  siofel: { name: 'First Sergeant Síofel', tint: [0.42, 0.18, 0.15] },
  rider: { name: 'A rider', tint: [0.30, 0.32, 0.22] },
};

export const SCRIPT = [
  { who: 'caulsleigh', line: 'There it is. Stanlech.' },
  { who: 'siofel', line: 'One town on two banks. Saes this side of the Yolo, Sźetter the other, and the one bridge between them.' },
  { who: 'caulsleigh', line: 'A Trenite, Tariel. Three nights in a row, and not as my daughter. As Thiah.' },
  { who: 'caulsleigh', line: 'Listen. Watch. Learn the town, its people, and anything in it that should not be there.' },
  { who: 'tariel', line: 'Three nights. Thiah has slept in worse places than a border town.' },
  { do: 'rider' },
  { who: 'rider', line: 'My lord! A rising, in the west of Cawel. You are wanted, you and every soldier with you.' },
  { who: 'caulsleigh', line: 'Then the Trenite begins without us. Síofel.' },
  { who: 'siofel', line: 'My lord.' },
  { who: 'siofel', line: 'Mind yourself down there, Thiah.' },
  { do: 'leave' },
];

export const OBJECTIVE = 'Go down to Stanlech';
