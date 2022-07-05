import createDebug from "debug";
import { promises as fsPromises } from "fs";
import { Parser, Builder } from "xml2js";

import { GpxFile } from "./gpx";
import { Lap, TpxFile, Trackpoint } from "./tpx";

const debug = createDebug("gpx-gr-merge");

export async function mergeHr(
  gpxFile: string,
  tcxFile: string,
  resultFile: string
): Promise<{
  gpxPoints: number;
  hrPoints: number;
  loops: number;
  matches: number;
}> {
  const gpxParser = new Parser();
  const tpxParser = new Parser();
  const builder = new Builder();

  const [gpxData, tpxData] = await Promise.all([fsPromises.readFile(gpxFile), fsPromises.readFile(tcxFile)]);
  const [gpx, tpx] = await Promise.all([
    gpxParser.parseStringPromise(gpxData) as Promise<GpxFile>,
    tpxParser.parseStringPromise(tpxData) as Promise<TpxFile>,
  ]);

  const trackPoints = gpx.gpx.trk[0].trkseg[0].trkpt;
  const hrPoints = tpx.TrainingCenterDatabase.Activities[0].Activity[0].Lap.reduce(
    (agg: Trackpoint[], currentValue: Lap) => {
      agg.push(...currentValue.Track[0].Trackpoint);
      return agg;
    },
    [] as Trackpoint[]
  );
  debug(`Merging ${trackPoints.length} GPX points with ${hrPoints.length} HR points...`);
  let loops = 0;
  let matches = 0;
  for (
    let gpxPos = 0, tpxPos = 0;
    gpxPos < trackPoints.length && tpxPos < hrPoints.length && loops < 1000000;
    loops++
  ) {
    const trackPoint = trackPoints[gpxPos];
    const hrPoint = hrPoints[tpxPos];
    const nextHrPoint = tpxPos < hrPoints.length - 1 ? hrPoints[tpxPos + 1] : undefined;
    const srcTime = new Date(trackPoint.time[0]);
    const trgTime = new Date(hrPoint.Time[0]);
    const nextTrgTime = nextHrPoint ? new Date(nextHrPoint.Time[0]) : undefined;
    const dateDiff = Math.abs(trgTime.getTime() - srcTime.getTime());

    if (dateDiff < 1000 || (srcTime > trgTime && srcTime <= (nextTrgTime ?? Number.MAX_VALUE))) {
      gpxPos++;
      if (dateDiff < 1000) {
        tpxPos++;
      }

      if (trackPoint.extensions?.some((ext) => ext["gpxtpx:TrackPointExtension"][0]["gpxtpx:hr"]?.length ?? 0 > 0)) {
        debug(`GPX at ${trackPoint.time[0]} already has HR`);
      } else {
        if (!trackPoint.extensions) {
          trackPoint.extensions = [];
        }
        trackPoint.extensions.push({
          "gpxtpx:TrackPointExtension": [
            {
              "gpxtpx:hr": [hrPoint.HeartRateBpm[0].Value[0]],
            },
          ],
        });
      }

      matches++;
    } else if (srcTime >= (nextTrgTime ?? Number.MAX_VALUE)) {
      tpxPos++;
    } else {
      gpxPos++;

      debug(`Unmatched GPX at ${trackPoint.time[0]}`, [dateDiff, srcTime, trgTime, nextTrgTime]);
    }
  }

  const xml = builder.buildObject(gpx);

  await fsPromises.writeFile(resultFile, xml);

  const result = {
    gpxPoints: trackPoints.length,
    hrPoints: hrPoints.length,
    loops,
    matches,
  };

  debug("%o", result);
  return result;
}
