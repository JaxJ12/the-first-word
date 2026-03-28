import fetch from 'node-fetch';

async function testCommentary() {
  try {
    const res = await fetch('https://bolls.life/get-commentary/1/John/1/1/');
    const text = await res.text();
    console.log("Bolls API response for John 1:1 :", text.substring(0, 500));
  } catch(e) {
    console.error("Error:", e);
  }
}

testCommentary();
