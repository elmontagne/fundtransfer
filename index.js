"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
console.log("Fundtransfer started.");
//todo check if config.json is there
const fs = require('fs');
const uuid4 = require('uuid4');
const { InverseClient, AccountAssetClient, } = require('bybit-api');
const { USDMClient } = require('binance');
const { Spot } = require('@binance/connector');
//const { stringify } = require('querystring');
const exchangeConf = require('./config.json');
const amountExchanges = exchangeConf.exchanges.length; //to define the amount of loops
let balance;
let pnl;
let used_margin;
let errorMessage;
let transferred;
let margin;
let initialMargin;
let maintenanceMargin;
const sleepTime = exchangeConf.sleeptime * 60000;
const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
};
function log_to_discord(discordUrl, errorMessage) {
    console.log(discordUrl);
    fetch(discordUrl, {
        method: 'POST',
        body: JSON.stringify({
            content: errorMessage
        }),
        headers: {
            'Content-type': 'application/json'
        }
    }).then(res => res.text())
        .catch((err) => {
        console.error('There was no Discord URL specified!');
    });
}
function binanceCheck(i, apiKey, privateKey, maxMargin, botName, discordUrl, percentageMove, uuid, savedPnl) {
    return __awaiter(this, void 0, void 0, function* () {
        const binClient = new USDMClient({
            api_key: apiKey,
            api_secret: privateKey,
        });
        const transferClient = new Spot(apiKey, privateKey);
        const spotBalance = (yield transferClient.userAsset('USDT')).data[0].free;
        const assets = (yield binClient.getAccountInformation('USDT')).assets;
        //binClient   
        //.getAccountInformation("USDT")
        //.then((result: { assets: string | any[]; }) => {
        const amountAssets = assets.length; //to define the amount of loops
        for (let b = 0; b < amountAssets; b++) {
            if (assets[b].asset === "USDT") {
                initialMargin = +assets[b].initialMargin;
                maintenanceMargin = +assets[b].maintMargin;
                pnl = +assets[b].marginBalance;
                balance = +pnl.toFixed(2);
                used_margin = ((initialMargin + maintenanceMargin) / balance) * 100;
                let profit = 0;
                if (savedPnl === 0) {
                    profit = 0.00;
                }
                else {
                    profit = pnl - savedPnl;
                    profit = +profit.toFixed(2);
                }
                transferred = (profit * percentageMove) / 100;
                transferred = +transferred.toFixed(2);
                let pnl2 = balance - transferred;
                //console.log('Profit: ',profit);
                //console.log('margin in use: ',used_margin);
                //console.log('Will transfer ',transferred);
                //console.log('Balance: ', balance);
                //console.log(result.assets[b]);
                if (pnl > savedPnl && savedPnl > 0) {
                    console.log("We have profit! USDT", profit);
                    margin = (used_margin / balance) * 100;
                    if (margin < maxMargin) {
                        errorMessage = "**TRANSFER:** SUCCESS **account:** " + botName + " **totalBalance:** " + balance + " **Profit:** " + profit + " **transferred:** " + transferred + " USDT" + " **spotBalance:** " + spotBalance;
                        log_to_discord(discordUrl, errorMessage);
                        // 2 -> futures to spot
                        transferClient.futuresTransfer('USDT', transferred, 2)
                            .then((response) => transferClient.logger.log(response.data))
                            .catch((error) => console.log(error));
                    }
                    else {
                        console.log("Can't transfer, above maximum defined margin.");
                        errorMessage = "**TRANSFER** FAIL **account**: " + botName + " **totalBalance:** " + balance + " **reason:** Can't transfer, above maximum defined margin." + " **spotBalance:** " + spotBalance;
                        log_to_discord(discordUrl, errorMessage);
                    }
                }
                else {
                    if (savedPnl === 0) {
                        console.log("There was no profit this time: 0");
                        errorMessage = "**TRANSFER** FAIL **account**: " + botName + " **totalBalance:** " + balance + " **reason:** There was no profit this time: 0" + " **spotBalance:** " + spotBalance;
                        log_to_discord(discordUrl, errorMessage);
                    }
                    else {
                        console.log("There was no profit this time: ", profit);
                        errorMessage = "**TRANSFER** FAIL **account**: " + botName + " **totalBalance:** " + balance + " **reason:** There was no profit this time: " + profit + " **spotBalance:** " + spotBalance;
                        log_to_discord(discordUrl, errorMessage);
                    }
                }
                exchangeConf.exchanges[i].pnl = pnl2;
                fs.writeFileSync('config.json', JSON.stringify(exchangeConf, null, 4));
            }
        }
    });
}
function bybitCheck(i, apiKey, privateKey, maxMargin, botName, discordUrl, percentageMove, uuid, savedPnl) {
    return __awaiter(this, void 0, void 0, function* () {
        //if (botName === "") { continue; }
        const client = new InverseClient({
            key: apiKey,
            secret: privateKey
        });
        const assetClient = new AccountAssetClient({
            key: apiKey,
            secret: privateKey
        });
        client.getWalletBalance("USDT")
            .then((result) => {
            balance = result.result.USDT.equity;
            //console.log(result);
            balance = +balance.toFixed(2);
            pnl = result.result.USDT.wallet_balance;
            used_margin = result.result.USDT.used_margin;
            let profit = 0;
            if (savedPnl === 0) {
                profit = 0.00;
            }
            else {
                profit = pnl - savedPnl;
                profit = +profit.toFixed(2);
            }
            transferred = (profit * percentageMove) / 100;
            transferred = +transferred.toFixed(2);
            let pnl2 = pnl - transferred;
            if (pnl > savedPnl && savedPnl > 0) {
                console.log("We have profit! USDT", profit);
                margin = (used_margin / balance) * 100;
                if (margin < maxMargin) {
                    errorMessage = "**TRANSFER:** SUCCESS **account:** " + botName + " **totalBalance:** " + balance + " **Profit:** " + profit + " **transferred:** " + transferred + " USDT";
                    log_to_discord(discordUrl, errorMessage);
                    //console.log(uuid);
                    assetClient.createInternalTransfer({
                        transfer_id: uuid,
                        coin: 'USDT',
                        amount: String(profit),
                        from_account_type: 'CONTRACT',
                        to_account_type: 'SPOT'
                    })
                        .then((result) => {
                        console.log(result);
                    });
                }
                else {
                    console.log("Can't transfer, above maximum defined margin.");
                    errorMessage = "**TRANSFER** FAIL **account**: " + botName + " **totalBalance:** " + balance + " **reason:** Can't transfer, above maximum defined margin.";
                    log_to_discord(discordUrl, errorMessage);
                }
            }
            else {
                if (savedPnl === 0) {
                    console.log("There was no profit this time: 0");
                    errorMessage = "**TRANSFER** FAIL **account**: " + botName + " **totalBalance:** " + balance + " **reason:** There was no profit this time: 0";
                    log_to_discord(discordUrl, errorMessage);
                }
                else {
                    console.log("There was no profit this time: ", profit);
                    errorMessage = "**TRANSFER** FAIL **account**: " + botName + " **totalBalance:** " + balance + " **reason:** There was no profit this time: " + profit;
                    log_to_discord(discordUrl, errorMessage);
                }
            }
            exchangeConf.exchanges[i].pnl = pnl2;
            fs.writeFileSync('config.json', JSON.stringify(exchangeConf, null, 4));
        })
            .catch((err) => {
            console.error("getWalletBalance error: ", err);
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        while (true) {
            for (let i = 0; i < amountExchanges; i++) {
                const apiKey = exchangeConf.exchanges[i].apikey;
                const privateKey = exchangeConf.exchanges[i].apisecret;
                const maxMargin = exchangeConf.exchanges[i].maxmargin;
                const botName = exchangeConf.exchanges[i].botname;
                const discordUrl = exchangeConf.exchanges[i].discord_webhook;
                const percentageMove = exchangeConf.exchanges[i].percentage_move;
                const exchange = exchangeConf.exchanges[i].exchange;
                const savedPnl = exchangeConf.exchanges[i].pnl;
                const uuid = uuid4();
                console.log("Checking exchange ", botName);
                if (exchange.toLowerCase() === "bybit") {
                    yield bybitCheck(i, apiKey, privateKey, maxMargin, botName, discordUrl, percentageMove, uuid, savedPnl);
                }
                if ((exchange.toLowerCase() === "binance") || (exchange.toLowerCase() === "finandy")) {
                    yield binanceCheck(i, apiKey, privateKey, maxMargin, botName, discordUrl, percentageMove, uuid, savedPnl);
                }
                yield sleep(2000);
            }
            console.log("Will wait for ", sleepTime / 60000, " minutes.");
            yield sleep(sleepTime);
        }
    });
}
main();
