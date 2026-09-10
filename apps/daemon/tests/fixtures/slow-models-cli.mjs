// Fixture CLI for the detection model-probe cap test: answers `--version`
// immediately (so the test always passes the version gate) but hangs on any
// other argv (so model enumeration only finishes via the def's own budget).
if (process.argv.includes('--version')) {
  console.log('9.9.9-fixture');
} else {
  await new Promise((resolve) => setTimeout(resolve, 15_000));
  console.log('[]');
}
