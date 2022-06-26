import { Element } from "./xml";

export interface Metadata extends Element {
  link?: {
    $: {
      href: string;
    };
    text: string[];
  };
  desc: string[];
  time: string[];
}

export interface GpxTpxTrackPointExtension extends Element {
  "gpxtpx:hr"?: string[];
}

export interface Extensions extends Element {
  "gpxtpx:TrackPointExtension": GpxTpxTrackPointExtension[];
}

export interface TrkPt extends Element {
  $: {
    lon: string;
    lat: string;
  };
  ele: string[];
  time: string[];
  extensions?: Extensions[];
}

export interface TrkSeg extends Element {
  trkpt: TrkPt[];
}

export interface Trk extends Element {
  name: string[];
  type: string[];
  trkseg: TrkSeg[];
}

export interface Gpx extends Element {
  metadata: Metadata[];
  trk: Trk[];
}

export interface GpxFile {
  gpx: Gpx;
}
