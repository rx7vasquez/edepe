const scraper = require('./services/PolinomioScraperService');
scraper.seedDatabase().then(res => {
    console.log("Terminado:", res);
    process.exit(0);
}).catch(console.error);
