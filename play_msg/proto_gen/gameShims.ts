import { MsgArray, MT } from "play_msg";

@MsgArray.Meta({
  name: "Vector2",
  fields: [
    ["x", MT.FLOAT, 0],
    ["y", MT.FLOAT, 0],
  ],
})
export class Vector2 {
  static ToArray: (v: Vector2, $deep?: number) => any[] | null;
  static FromArray: (arr: any[]) => Vector2;
  static ToRefArray: (val: Vector2) => any[];
  static FromRefArray: (arr: any[]) => Vector2;

  public x: number;
  public y: number;
}

@MsgArray.Meta({
  name: "Vector3",
  fields: [
    ["x", MT.FLOAT, 0],
    ["y", MT.FLOAT, 0],
    ["z", MT.FLOAT, 0],
  ],
})
export class Vector3 {
  static ToArray: (v: Vector3, $deep?: number) => any[] | null;
  static FromArray: (arr: any[]) => Vector3;
  static ToRefArray: (val: Vector3) => any[];
  static FromRefArray: (arr: any[]) => Vector3;

  public x: number;
  public y: number;
  public z: number;
}

@MsgArray.Meta({
  name: "Vector4",
  fields: [
    ["x", MT.FLOAT, 0],
    ["y", MT.FLOAT, 0],
    ["z", MT.FLOAT, 0],
  ],
})
export class Vector4 {
  static ToArray: (v: Vector4, $deep?: number) => any[] | null;
  static FromArray: (arr: any[]) => Vector4;
  static ToRefArray: (val: Vector4) => any[];
  static FromRefArray: (arr: any[]) => Vector4;

  public x: number;
  public y: number;
  public z: number;
  public w: number;
}

@MsgArray.Meta({
  name: "Quaternion",
  fields: [
    ["x", MT.FLOAT, 0],
    ["y", MT.FLOAT, 0],
    ["z", MT.FLOAT, 0],
  ],
})
export class Quaternion {
  static ToArray: (v: Quaternion, $deep?: number) => any[] | null;
  static FromArray: (arr: any[]) => Quaternion;
  static ToRefArray: (val: Quaternion) => any[];
  static FromRefArray: (arr: any[]) => Quaternion;

  public x: number;
  public y: number;
  public z: number;
  public w: number;
}
@MsgArray.Meta({
  name: "Color",
  fields: [
    ["r", MT.FLOAT, 0],
    ["g", MT.FLOAT, 0],
    ["b", MT.FLOAT, 0],
    ["a", MT.FLOAT, 0],
  ],
})
export class Color {
  static ToArray: (v: Color, $deep?: number) => any[] | null;
  static FromArray: (arr: any[]) => Color;
  static ToRefArray: (val: Color) => any[];
  static FromRefArray: (arr: any[]) => Color;

  public r: number;
  public g: number;
  public b: number;
  public a: number;
}
@MsgArray.Meta({
  name: "Rect",
  fields: [
    ["x", MT.FLOAT, 0],
    ["y", MT.FLOAT, 0],
    ["width", MT.FLOAT, 0],
    ["height", MT.FLOAT, 0],
  ],
})
export class Rect {
  static ToArray: (v: Rect, $deep?: number) => any[] | null;
  static FromArray: (arr: any[]) => Rect;
  static ToRefArray: (val: Rect) => any[];
  static FromRefArray: (arr: any[]) => Rect;

  public x: number;
  public y: number;
  public width: number;
  public height: number;
}
@MsgArray.Meta({
  name: "Bounds",
  fields: [
    ["center", Vector3, 0],
    ["size", Vector3, 0],
  ],
})
export class Bounds {
  static ToArray: (v: Bounds, $deep?: number) => any[] | null;
  static FromArray: (arr: any[]) => Bounds;
  static ToRefArray: (val: Bounds) => any[];
  static FromRefArray: (arr: any[]) => Bounds;

  public center: Vector3;
  public size: Vector3;
}

@MsgArray.Meta({
  name: "Color32",
  fields: [
    ["r", MT.SHORT, 0],
    ["g", MT.SHORT, 0],
    ["b", MT.SHORT, 0],
    ["a", MT.SHORT, 0],
  ],
})
export class Color32 {
  static ToArray: (v: Color32, $deep?: number) => any[] | null;
  static FromArray: (arr: any[]) => Color32;
  static ToRefArray: (val: Color32) => any[];
  static FromRefArray: (arr: any[]) => Color32;

  public r: number;
  public g: number;
  public b: number;
  public a: number;
}

@MsgArray.Meta({
  name: "Vector2Int",
  fields: [
    ["x", MT.INT, 0],
    ["y", MT.INT, 0],
  ],
})
export class Vector2Int {
  static ToArray: (v: Vector2Int, $deep?: number) => any[] | null;
  static FromArray: (arr: any[]) => Vector2Int;
  static ToRefArray: (val: Vector2Int) => any[];
  static FromRefArray: (arr: any[]) => Vector2Int;

  public x: number;
  public y: number;
}
@MsgArray.Meta({
  name: "Vector3Int",
  fields: [
    ["x", MT.INT, 0],
    ["y", MT.INT, 0],
    ["z", MT.INT, 0],
  ],
})
export class Vector3Int {
  static ToArray: (v: Vector3Int, $deep?: number) => any[] | null;
  static FromArray: (arr: any[]) => Vector3Int;
  static ToRefArray: (val: Vector3Int) => any[];
  static FromRefArray: (arr: any[]) => Vector3Int;

  public x: number;
  public y: number;
  public z: number;
}
@MsgArray.Meta({
  name: "RectInt",
  fields: [
    ["x", MT.INT, 0],
    ["y", MT.INT, 0],
    ["width", MT.INT, 0],
    ["height", MT.INT, 0],
  ],
})
export class RectInt {
  static ToArray: (v: RectInt, $deep?: number) => any[] | null;
  static FromArray: (arr: any[]) => RectInt;
  static ToRefArray: (val: RectInt) => any[];
  static FromRefArray: (arr: any[]) => RectInt;

  public x: number;
  public y: number;
  public width: number;
  public height: number;
}
@MsgArray.Meta({
  name: "BoundsInt",
  fields: [
    ["center", Vector3Int, 0],
    ["size", Vector3Int, 0],
  ],
})
export class BoundsInt {
  static ToArray: (v: BoundsInt, $deep?: number) => any[] | null;
  static FromArray: (arr: any[]) => BoundsInt;
  static ToRefArray: (val: BoundsInt) => any[];
  static FromRefArray: (arr: any[]) => BoundsInt;

  public center: Vector3Int;
  public size: Vector3Int;
}
@MsgArray.Meta({
  name: "RangeInt",
  fields: [
    ["start", MT.INT, 0],
    ["length", MT.INT, 0],
  ],
})
export class RangeInt {
  static ToArray: (v: RangeInt, $deep?: number) => any[] | null;
  static FromArray: (arr: any[]) => RangeInt;
  static ToRefArray: (val: RangeInt) => any[];
  static FromRefArray: (arr: any[]) => RangeInt;

  public start: number;
  public length: number;
}
@MsgArray.Meta({
  name: "RectOffset",
  fields: [
    ["left", MT.INT, 0],
    ["right", MT.INT, 0],
    ["top", MT.INT, 0],
    ["bottom", MT.INT, 0],
  ],
})
export class RectOffset {
  static ToArray: (v: RectOffset, $deep?: number) => any[] | null;
  static FromArray: (arr: any[]) => RectOffset;
  static ToRefArray: (val: RectOffset) => any[];
  static FromRefArray: (arr: any[]) => RectOffset;

  public left: number;
  public right: number;
  public top: number;
  public bottom: number;
}
//import {Vector2,Vector3,Vector4,Quaternion,Color,Rect,Bounds,Color32,Vector2Int,Vector3Int,RectInt,RangeInt,RectOffset} from "./gameShims";
