'use strict';

var aParserTypes = require('a-parser-types');
var jsdom = require('jsdom');

const API_KEY = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwOi8vMC4wLjAuMDo4MDgwL2FkZF95dF91c2VycyIsImlzcyI6Imh0dHA6Ly8wLjAuMC4wOjgwODAvIiwidXNlcm5hbWUiOiJhZG1pbiIsImV4cCI6MTY5OTk2NzUyNH0.hxHE12HGst3XLF0P0abslCfO0Oe-T5GSiZdfO7i5aGukBLYXFhmp9UxgLTPQtK92E7THM8YVIbOGB8BsFNU2jw";
class JS_AccsMarketParser extends aParserTypes.BaseParser {
    async parse(set, results) {
        this.logger.put("Start scraping query: " + set.query);
        const { success, data } = await this.request('GET', "https://accsmarket.com/" + set.query + "/catalog/drugie-akkaunty/tiktok", {}, {
            decode: 'auto-html',
            headers: {
                accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            }
        });
        results.success = success;
        this.logger.put("Data from GET request: " + data);
        const dom = new jsdom.JSDOM(data.toString());
        let sections = dom.window.document.querySelector(".soc-bl").getElementsByTagName("section");
        let sectionsLength = sections.length;
        const marketGmailAccounts = [];
        for (let i = 0; i < sectionsLength; i++) {
            let sectionItemChildren = sections[i].children;
            for (let child of sectionItemChildren) {
                let product_id = child.querySelector(".button-wrap").getElementsByTagName("button")[0].getAttribute("data-id");
                let title = child.querySelector(".soc-text").getElementsByTagName("a")[0].textContent;
                let link = "https://accsmarket.com" + child.querySelector(".soc-text").getElementsByTagName("a")[0].getAttribute("href");
                let cost = child.getAttribute("data-cost");
                let quantity = child.getAttribute("data-qty");
                let datestamp = Date.now();
                let accountObject = {
                    product_id: product_id,
                    title: title,
                    link: link,
                    cost: cost,
                    quantity: quantity,
                    datestamp: datestamp
                };
                marketGmailAccounts.push(accountObject);
                this.logger.put("gmail account: " + "\n" +
                    "product_id: " + accountObject.product_id + "\n" +
                    "title: " + accountObject.title + "\n" +
                    "link: " + accountObject.link + "\n" +
                    "cost: " + accountObject.cost + "\n" +
                    "quantity: " + accountObject.quantity + "\n" +
                    "datestamp: " + accountObject.datestamp);
            }
        }
        results.total_count = marketGmailAccounts.length;
        if (results.serp) {
            for (let item of marketGmailAccounts) {
                results.serp.push(item.product_id, item.title, item.link, item.cost, item.quantity, item.datestamp);
            }
            this.logger.put("Total found " + results.total_count + " items");
        }
        // const request = await this.request('POST', "http://0.0.0.0:8080/update_accs_market_products", {}, {
        //     body: JSON.stringify(marketGmailAccounts),
        //     headers: {
        //         'Content-Type' : 'application/json',
        //         'Authorization': 'Bearer ' + API_KEY
        //     }
        // });
        // if (request.success) {
        //     this.logger.put("Update Accs Market Products DB, " + request.data)
        // }
        return results;
    }
}
JS_AccsMarketParser.defaultConf = {
    version: '0.0.66',
    results: {
        flat: [
            ['total_count', 'Results count'],
        ],
        arrays: {
            serp: ['Serp', [
                    ['product_id', 'Product/Seller ID'],
                    ['title', 'Product Item Title'],
                    ['link', 'URL To A Product'],
                    ['cost', 'Product Cost Per Account'],
                    ['quantity', 'Product Item Quantity'],
                    ['datestamp', "UNIX Datestamp"]
                ]]
        }
    },
    results_format: "$query",
    max_size: 2 * 1024 * 1024,
    parsecodes: {
        200: 1,
    }
};
JS_AccsMarketParser.editableConf = [];

exports.JS_AccsMarketParser = JS_AccsMarketParser;
