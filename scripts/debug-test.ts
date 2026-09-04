async function check() {
  try {
    const res = await fetch('http://localhost:3000/builder/default');
    console.log('HTTP STATUS:', res.status);
    const text = await res.text();
    console.log('LENGTH:', text.length);
    console.log('HAS APEX:', text.includes('Apex Studio') || text.includes('LOADING APEX STUDIO') || text.includes('BuilderShell'));
    console.log('SNIPPET:', text.slice(0, 300));
  } catch (err: any) {
    console.error('FETCH ERROR:', err.message);
  }
}
check();
