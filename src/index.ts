import { existsSync } from "fs";
import { extname } from "path";
import * as readline from "readline";

import { mergeHr } from "./merge";

(async () => {
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

  const result = await mergeHr(gpxFile, tcxFile, resultFile);

  console.log(
    `Merged ${result.gpxPoints} GPX points with ${result.hrPoints} HR points in ${result.loops} loops with ${result.matches} points updated`
  );

  process.exit(0);
})();
