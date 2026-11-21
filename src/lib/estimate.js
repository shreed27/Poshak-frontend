// Customers book by number of clothes; the rider weighs the bag at pickup and that sets the real price.
// Until then we estimate the weight from the count: an average garment (shirt, tee, trousers, towel mix) is ~250 g.
export const KG_PER_PIECE = 0.25;
export const DEFAULT_PIECES = 10;
export const MAX_PIECES = 150;

export const kgFor = (pieces) => Math.max(0.5, Math.round(pieces * KG_PER_PIECE * 2) / 2);   // nearest 0.5 kg
export const estPrice = (pieces, ratePerKg) => Math.round(pieces * KG_PER_PIECE * ratePerKg);
export const perPiece = (ratePerKg) => Math.max(1, Math.round(ratePerKg * KG_PER_PIECE));
export const clothesLabel = (n) => `${n} ${n === 1 ? 'piece' : 'clothes'}`;
