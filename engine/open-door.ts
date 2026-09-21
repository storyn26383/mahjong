/** 牌山方位，以莊家為基準：莊家喺下方，下家喺右。 */
export enum Position {
  Bottom = 'bottom',
  Right = 'right',
  Top = 'top',
  Left = 'left',
}

/** 攞牌方向（俯瞰）。出牌次序逆時針，但攞牌沿牌山順時針。 */
export enum DrawDirection {
  Clockwise = 'clockwise',
}

export const DICE_COUNT = 3
export const STACKS_PER_WALL = 18

/** 由莊家起逆時針數：莊家、下家、對家、上家。 */
const POSITION_ORDER = [Position.Bottom, Position.Right, Position.Top, Position.Left]
/** 數位時莊家自己係第 1 位。 */
const DEALER_COUNTS_AS = 1

export interface OpenDoorInput {
  dice: [number, number, number]
}

export interface OpenDoorResult {
  /** 開門嗰面牌山相對莊家嘅方位。 */
  wall: Position
  /** 由該山右邊數起跳過嘅墩數；攞牌由下一墩開始。 */
  skippedStacks: number
  drawDirection: DrawDirection
}

export const openDoor = ({ dice }: OpenDoorInput): OpenDoorResult => {
  const total = dice[0] + dice[1] + dice[2]
  const ownerFromDealer = (total - DEALER_COUNTS_AS) % POSITION_ORDER.length
  return { wall: POSITION_ORDER[ownerFromDealer]!, skippedStacks: total, drawDirection: DrawDirection.Clockwise }
}
