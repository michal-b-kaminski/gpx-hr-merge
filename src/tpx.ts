import { Element } from "./xml";

export interface HeartRateBpm extends Element {
  Value: string[];
}

export interface Trackpoint extends Element {
  Time: string[];
  Position: string[];
  AltitudeMeters: string[];
  DistanceMeters: string[];
  HeartRateBpm: HeartRateBpm[];
}

export interface Track extends Element {
  Trackpoint: Trackpoint[];
}

export interface Lap extends Element {
  $: {
    StartTime: string;
  };
  TotalTimeSeconds: string[];
  DistanceMeters: string[];
  Calories: string[];
  Intensity: string[];
  TriggerMethod: string[];
  Track: Track[];
}

export interface Creator extends Element {
  $: {
    "xsi:type": string;
    "xmlns:xsi": string;
  };
  UnitId: string[];
  ProductID: string[];
}

export interface Activity extends Element {
  $: {
    Sport: string;
  };
  Id: string[];
  Lap: Lap[];
  Creator: Creator[];
}

export interface Activities extends Element {
  Activity: Activity[];
}

export interface TrainingCenterDatabase extends Element {
  Activities: Activities[];
}

export interface TpxFile {
  TrainingCenterDatabase: TrainingCenterDatabase;
}
