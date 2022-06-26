import { existsSync, promises as fsPromises } from "fs";
import { extname } from "path";
import * as readline from "readline";
import { Parser, Builder } from "xml2js";

import { GpxFile } from "./gpx";
import { Lap, TpxFile, Trackpoint } from "./tpx";

(async () => {
  const gpxParser = new Parser();
  const tpxParser = new Parser();
  const builder = new Builder();

  const usageMessage =
    "Usage:\n\tgpx-hr-merge <gpx file> <tcx file> [<output file>]\n\nIf called without <output file>, will overwrite <gpx file>.";
  const args = process.argv.slice(2);
  if (args.length !== 2 && args.length !== 3) {
    console.log(`Invalid number of parameters.\n${usageMessage}`);
    process.exit(-1);
  }

  const gpxFile = args[0];
  const tcxFile = args[1];
  const resultFile = args.length === 3 ? args[2] : args[1];

  if (extname(gpxFile) !== ".gpx" || extname(tcxFile) !== ".tcx") {
    console.log(`Invalid parameters. First parameter must be GPX file, second must be TCX file.\n${usageMessage}`);
    process.exit(-2);
  }

  const resultExists = existsSync(resultFile);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  console.log(
    `Updating ${gpxFile} with heart rate data from ${tcxFile}, writing to ${resultFile}${
      resultExists ? " (will be overwritten)" : ""
    }.`
  );
  const rlQuestion = (question: string) =>
    new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  const decision = await rlQuestion("Continue? [y/N] ");

  if (decision !== "y") {
    console.log("Exiting...");
    process.exit(-3);
  }

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
  console.log(`Merging ${trackPoints.length} GPX points with ${hrPoints.length} HR points...`);
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
        console.log(`GPX at ${trackPoint.time[0]} already has HR`);
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

      console.log(`Unmatched GPX at ${trackPoint.time[0]}`, [dateDiff, srcTime, trgTime, nextTrgTime]);
    }
  }
  console.log(
    `Merging ${trackPoints.length} GPX points with ${hrPoints.length} HR points in ${loops} loops with ${matches} points updated`
  );

  const xml = builder.buildObject(gpx);

  await fsPromises.writeFile(resultFile, xml);

  process.exit(0);
})();
