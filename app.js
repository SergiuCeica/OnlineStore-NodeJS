const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const bodyParser = require("body-parser");
const app = express();
const port = 6789;
const fs = require('fs').promises;
// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set("view engine", "ejs");
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static("public"));
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.get("/", (req, res) => res.send("Hello World"));
// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată;
async function citesteIntrebari(){
  const data= await fs.readFile("intrebari.json","utf-8");
  let intrebari = Buffer.from(data);
  return JSON.parse(intrebari);
}
app.get("/chestionar", async (req, res) => {
  var listaIntrebari = await citesteIntrebari();
  // în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
  res.render("chestionar", { intrebari: listaIntrebari });
});
app.post("/rezultat-chestionar", async (req, res) => {
  var raspunsuri=req.body;
  var listaIntrebari = await citesteIntrebari();
  console.log(raspunsuri);
  var c=0;
  for(let prop in raspunsuri){
    for( let intr in listaIntrebari){
      if(listaIntrebari[intr].intrebare == prop){
        console.log(listaIntrebari[intr].corect + "      ---   " + raspunsuri[prop])
        if(listaIntrebari[intr].corect == raspunsuri[prop]){
          c=c+1;
        }
      }
    }
  }
  console.log('Intrebari corecte: ' + c);
  res.send('Intrebari corecte: ' + c);
});
app.listen(port, () =>
  console.log(`Serverul rulează la adresa http://localhost:`)
);
