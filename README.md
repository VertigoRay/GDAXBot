You're free to use mycode with one caveat: give me a donation. I have two simple and free options for donations:

- Make your coinbase account with [my referral link](https://www.coinbase.com/join/593ec37501653a0135721e05).
    +  Once you buy or sell $100 of digital currency or more, you and I both will get $10 of free bitcoin.
- Send me $10 (or more) in BTC from your profits when you start making some money:
    + `1PbTgWny4EEqLLjE28WDkcAYvwemo7XHBP`

# Pre-requisites

## NodeJS

I'm using [v6.11.0 LTS](https://nodejs.org/en/).

# Prep Work

1. Make sure you have a [Coinbase](https://coinbase.com) account; if not you can make one with [my referral link](https://www.coinbase.com/join/593ec37501653a0135721e05) and we'll both get $10.
1. Go to [GDAX](https://gdax.com) and log in with your Coinbase account; they're the *same company*.
    - [Make an API key](https://www.gdax.com/settings/api) with `View` and `Trade` permissions.
    - Take note of the Passphrase, Key, and Key Secret that you are shown; your bot will need these for access to your account.

## Notes

Your bot will have access to all funds in your GDAX account. You can move funds back and forth between Coinbase and GDAX instantly for free. So, if you want to *hide* money from the bot, keep it in Coinbase.

# Bot Configuration

The configuration files should be located in the `config` folder.

:warning: **Do *NOT* edit the `default.yaml` file!!**

Do not edit the `default.yaml` file. This file contains the default settings. Instead, copy this file to a new file in in the same directory (`config`) and name it: `production.yaml`.

If you want to secure your production config files, [there's documentation for that](https://github.com/lorenwest/node-config/wiki/Securing-Production-Config-Files).

Any settings not in the `production.yaml` will be pulled from the `default.yaml` file automatically. So, be sure to keep the `default.yaml` file; don't delete it.

The `NODE_ENV` environment variable will have to match the name of the YAML file that you're using; for example:

- Windows: `SET NODE_ENV=production`
- Linux/OSX: `export NODE_ENV=production`

# Starting the Bot

## Quick Start

Browse the the directory with this application. Set your `NODE_ENV` and start the application.

### Windows

```cmd
cd GDAX
SET NODE_ENV=production
npm start
```

### Linux / OSX

```cmd
cd GDAX
export NODE_ENV=production
npm start
```
