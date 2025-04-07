import { MsgArray, MT } from "play_msg";

@MsgArray.Meta({
  name: "Vector2",
  fields: [
    ["x", MT.FLOAT, 0],
    ["y", MT.FLOAT, 0],
  ],
})
export class Vector2 extends MsgArray<Vector2> {
  static ToArray: <T>(v: T, $deep?: number) => any[] | null;
  static FromArray: <T>(arr: any[]) => T;
  static ToRefArray: <T>(val: T) => any[];
  static FromRefArray: <T>(arr: any[]) => T;

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
export class Vector3 extends MsgArray<Vector3> {
  static ToArray: <T>(v: T, $deep?: number) => any[] | null;
  static FromArray: <T>(arr: any[]) => T;
  static ToRefArray: <T>(val: T) => any[];
  static FromRefArray: <T>(arr: any[]) => T;

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
export class Vector4 extends MsgArray<Vector4> {
  static ToArray: <T>(v: T, $deep?: number) => any[] | null;
  static FromArray: <T>(arr: any[]) => T;
  static ToRefArray: <T>(val: T) => any[];
  static FromRefArray: <T>(arr: any[]) => T;

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
export class Quaternion extends MsgArray<Quaternion> {
  static ToArray: <T>(v: T, $deep?: number) => any[] | null;
  static FromArray: <T>(arr: any[]) => T;
  static ToRefArray: <T>(val: T) => any[];
  static FromRefArray: <T>(arr: any[]) => T;

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
export class Color extends MsgArray<Color> {
  static ToArray: <T>(v: T, $deep?: number) => any[] | null;
  static FromArray: <T>(arr: any[]) => T;
  static ToRefArray: <T>(val: T) => any[];
  static FromRefArray: <T>(arr: any[]) => T;

  public r: number;
  public g: number;
  public b: number;
  public a: number = 1;
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
export class Rect extends MsgArray<Rect> {
  static ToArray: <T>(v: T, $deep?: number) => any[] | null;
  static FromArray: <T>(arr: any[]) => T;
  static ToRefArray: <T>(val: T) => any[];
  static FromRefArray: <T>(arr: any[]) => T;

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
export class Bounds extends MsgArray<Bounds> {
  static ToArray: <T>(v: T, $deep?: number) => any[] | null;
  static FromArray: <T>(arr: any[]) => T;
  static ToRefArray: <T>(val: T) => any[];
  static FromRefArray: <T>(arr: any[]) => T;

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
export class Color32 extends MsgArray<Color32> {
  static ToArray: <T>(v: T, $deep?: number) => any[] | null;
  static FromArray: <T>(arr: any[]) => T;
  static ToRefArray: <T>(val: T) => any[];
  static FromRefArray: <T>(arr: any[]) => T;

  public r: number;
  public g: number;
  public b: number;
  public a: number = 1;
}

@MsgArray.Meta({
  name: "Vector2Int",
  fields: [
    ["x", MT.INT, 0],
    ["y", MT.INT, 0],
  ],
})
export class Vector2Int extends MsgArray<Vector2Int> {
  static ToArray: <T>(v: T, $deep?: number) => any[] | null;
  static FromArray: <T>(arr: any[]) => T;
  static ToRefArray: <T>(val: T) => any[];
  static FromRefArray: <T>(arr: any[]) => T;

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
export class Vector3Int extends MsgArray<Vector3Int> {
  static ToArray: <T>(v: T, $deep?: number) => any[] | null;
  static FromArray: <T>(arr: any[]) => T;
  static ToRefArray: <T>(val: T) => any[];
  static FromRefArray: <T>(arr: any[]) => T;

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
export class RectInt extends MsgArray<RectInt> {
  static ToArray: <T>(v: T, $deep?: number) => any[] | null;
  static FromArray: <T>(arr: any[]) => T;
  static ToRefArray: <T>(val: T) => any[];
  static FromRefArray: <T>(arr: any[]) => T;

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
export class BoundsInt extends MsgArray<BoundsInt> {
  static ToArray: <T>(v: T, $deep?: number) => any[] | null;
  static FromArray: <T>(arr: any[]) => T;
  static ToRefArray: <T>(val: T) => any[];
  static FromRefArray: <T>(arr: any[]) => T;

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
export class RangeInt extends MsgArray<RangeInt> {
  static ToArray: <T>(v: T, $deep?: number) => any[] | null;
  static FromArray: <T>(arr: any[]) => T;
  static ToRefArray: <T>(val: T) => any[];
  static FromRefArray: <T>(arr: any[]) => T;

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
export class RectOffset extends MsgArray<RectOffset> {
  static ToArray: <T>(v: T, $deep?: number) => any[] | null;
  static FromArray: <T>(arr: any[]) => T;
  static ToRefArray: <T>(val: T) => any[];
  static FromRefArray: <T>(arr: any[]) => T;

  public left: number;
  public right: number;
  public top: number;
  public bottom: number;
}
//import {Vector2,Vector3,Vector4,Quaternion,Color,Rect,Bounds,Color32,Vector2Int,Vector3Int,RectInt,RangeInt,RectOffset} from "./gameShims";
