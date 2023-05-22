const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const cookieParser=require('cookie-parser');
var session = require('express-session');
const bodyParser = require("body-parser");
const app = express();
const port = 6789;
const fs = require('fs').promises;
// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set("view engine", "ejs");
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);

app.use(cookieParser());

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
  maxAge: 600000
  }
}));
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static("public"));
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.use("/", (req, res, next) => {
  if (!req.session.produse) {
    req.session.produse = []; // Inițializează req.session.produse dacă nu există
  }
  next(); // Continuă procesarea rutei
});
app.get("/", (req, res) => res.render('index', {username: req.session.username, rol: req.session.rol,listaProduse: req.session.produse}));
// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată;
async function citesteIntrebari(){
  const data= await fs.readFile("intrebari.json","utf-8");
  let intrebari = Buffer.from(data);
  return JSON.parse(intrebari);
}
async function citesteUtilizatori(){
  const data= await fs.readFile("utilizatori.json","utf-8");
  let utilizatori = Buffer.from(data);
  return JSON.parse(utilizatori);
}
app.get("/chestionar", async (req, res) => {
  var listaIntrebari = await citesteIntrebari();
  // în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
  res.render("chestionar", { intrebari: listaIntrebari , username: req.session.username, rol: req.session.rol});
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
  res.render("rezultat-chestionar",{nrIntrebari : c});
});
app.get('/autentificare', (req, res) =>{
  res.clearCookie("mesajEroare");
  res.render('autentificare', { mesaj: req.cookies.mesajEroare, username: req.session.username, rol: req.session.rol});
});



app.post('/verificare-autentificare', async (req, res) =>{
  console.log("USER: ", req.body);
  let listaUtilizatori = await citesteUtilizatori();
  let username = req.body['nume'],
      password = req.body['parola'];
  var utilizator =null;
  for(i=0; i<listaUtilizatori.length;i++){
    if(listaUtilizatori[i].utilizator == username){
      utilizator = listaUtilizatori[i];
      break;
    }
  }
  if(utilizator!=null && password == utilizator.parola){
    res.cookie("numeUtilizator", utilizator.prenume);
    req.session.username = utilizator.prenume;
    req.session.rol=utilizator.rol;
    res.redirect('/');
  }
  else{
        res.cookie("mesajEroare", "Utilizator sau parola gresite!!");
        res.redirect('/autentificare');
      }
});

app.post('/logout',(req,res)=>{
  res.clearCookie("utilizator");
  req.session.destroy;
  req.session.username=undefined;
  res.redirect('/autentificare');
});

const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('cumparaturi.db', sqlite3.OPEN_READWRITE , (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the cumparaturi database.');
});

let createTable="CREATE TABLE IF NOT EXISTS produse (id_prod INTEGER PRIMARY KEY AUTOINCREMENT,nume VARCHAR(25), pret VARCHAR(25))";

var produse=[];

app.get('/creare-bd',(req,res) =>{
  db.get(createTable, [], (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Baza de date creata");
  });
  res.redirect('/');
});

app.get('/inserare-bd',async (req,res) =>{

  await new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS count FROM produse', (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      if (result.count === 0) {
        var values = [
          ['Canon EOS 4000D', '2749,00'],
          ['Canon EOS 6D', '6499,90'],
          ['Canon EOS 250D', '3349,90'],
          ['Sony Cyber-Shot', '8899,90'],
          ['Sony DSC-HX60', '989,99'],
          ['Nikon Z 50', '4489,90'],
          ['Nikon Z6 II', '8799,99']
        ];

        db.serialize(() => {
          db.run(createTable, (err) => {
            if (err) {
              reject(err);
            } else {
              console.log('Tabela produse creată sau deja existentă');
            }
          });

          var insertStmt = db.prepare('INSERT INTO produse (nume, pret) VALUES (?, ?)');
          values.forEach((produs) => {
            insertStmt.run(produs[0], produs[1]);
          });
          insertStmt.finalize();

          console.log('Produsele predefinite au fost inserate cu succes');
          resolve();
        });
      } else {
        console.log('Exista deja produse in baza de date');
        resolve();
      }
    });
  });

  if (!req.session.produse || req.session.produse.length === 0) {
    let extrageProduse = `SELECT * FROM produse`;

    await new Promise((resolve, reject) => {
      db.all(extrageProduse, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          req.session.produse = rows;
          res.redirect('/');
          resolve();
        }
      });
    });
  } else {
    res.redirect('/');
  }
});

app.post('/adaugare-cos',(req,res)=>{
  var data = req.body;
  var produs = {
    idProdus: data['idProdus'],
    nume: data['nume'],
    pret: data['pret']
  };

  if (req.session.cos) {
    req.session.cos.push(produs);
  } else {
    req.session.cos = [produs];
  }

  console.log(req.session.cos);
  res.redirect('/');
});

app.get('/vizualizare-cos', (req, res) => {
  res.render('vizualizare-cos', { cos: req.session.cos, username: req.session.username, rol: req.session.rol });
});

app.get('/admin', (req, res) => {
  res.render('admin',{username: req.session.username, rol:req.session.rol});
});

app.post('/adauga-produs',async (req,res) =>{
  console.log(req.body);

  // Verifică dacă produsul există deja în baza de date
  var verificaProdus = `SELECT COUNT(*) AS count FROM produse WHERE nume = ?`;
  var produsNume = req.body['numeProdus'];

  await new Promise((resolve, reject) => {
    db.get(verificaProdus, [produsNume], (err, row) => {
      if (err) {
        reject(err);
      } else {
        if (row.count > 0) {
          // Produsul există deja în baza de date
          console.log('Produsul există deja în baza de date.');
        } else {
          // Produsul nu există, poate fi inserat
          var sql = "INSERT INTO produse (nume, pret) VALUES (?, ?)";
          var produsPret = req.body['pretProdus'];

          db.run(sql, [produsNume, produsPret], function (err) {
            if (err) {
              reject(err);
            } else {
              console.log(`Rows inserted ${this.changes}`);
              resolve();
            }
          });
        }
      }
    });
  });

  res.redirect('/');
});

app.listen(port, () =>
  console.log(`Serverul rulează la adresa http://localhost:`)
);
