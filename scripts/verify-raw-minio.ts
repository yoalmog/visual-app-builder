async function main() {
  try {
    const res = await fetch('http://127.0.0.1:9000/minio/health/live');
    console.log('HTTP STATUS:', res.status);
    console.log('BODY:', await res.text());
  } catch (err) {
    console.log('CONNECT FAILED:', err instanceof Error ? err.message : err);
  }
}

main();
