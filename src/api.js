const API_KEY = '6e2245d732a984efcc66328acde899e5f92dc06b13f7a872e73362d30a3d052e'

const tickersHandlers = new Map();
const tickersBTC = [];

const socket = new WebSocket(`wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`)
const AGGREGATE_INDEX = '5';

const subcribeToTickerWS = (ticker, currency) => {
  const data = {
    action: "SubAdd",
    subs: [`${AGGREGATE_INDEX}~CCCAGG~${ticker}~${currency}`],
  };
  socket.send(JSON.stringify(data))
}

const unsubscribeFromTickerWS = (ticker, currency) => {
  const data = {
    action: "SubRemove",
      subs: [`${AGGREGATE_INDEX}~CCCAGG~${ticker}~${currency}`],
  };
  socket.send(JSON.stringify(data));
}

const getErrorInfoFromParameter = (parameter) => {
  const arrayParams = parameter.split('~').reverse();
  return {
    fromTicker: arrayParams[1],
    toTicker: arrayParams[0],
  }
}

const tickerNotFoundInResource = (type, to) => {
  return type === '500' && to === 'BTC';
}

const isError = (type, parameter) => {
  return type === '500' && parameter;
}

const correctIndexAndNewPrice = (type, newPrice) => {
  return type !== AGGREGATE_INDEX || newPrice === undefined
}

const checkBTCSubscriptionAndAddNewDependence = (toTicker, ticker) => {
  if (toTicker !== 'BTC') return;
  if (!tickersHandlers.has('BTC')) subcribeToTickerWS('BTC', 'USD');
  tickersBTC.push(ticker);
} 

const tickerIsBTCAndCallDependenceHandlers = (currency, newPrice) => {
  if (currency !== 'BTC') return;
  tickersBTC.forEach(el => {
    const handlers = tickersHandlers.get(el.ticker) || [];
    handlers.forEach(fn => fn(el.btcPrice*newPrice))
  })
}

socket.addEventListener('message', async (e) => {
    const {TYPE: type, FROMSYMBOL: currency, PARAMETER: parameter, TOSYMBOL: toSymbol, PRICE: newPrice} = JSON.parse(e.data);

    if (isError(type, parameter)) {
      const {fromTicker, toTicker} = getErrorInfoFromParameter(parameter);
      if (tickerNotFoundInResource(type, toTicker)) {
        const handlers = tickersHandlers.get(fromTicker) || [];
        handlers.forEach(fn => fn('-', true))
        return;
      }
      subcribeToTickerWS(fromTicker, 'BTC')
    }

    if (correctIndexAndNewPrice(type, newPrice)) {
      return;
    }

    checkBTCSubscriptionAndAddNewDependence(toSymbol, {
      ticker: currency,
      btcPrice: newPrice,
    })


    tickerIsBTCAndCallDependenceHandlers(currency, newPrice);

    const handlers = tickersHandlers.get(currency) || [];
    handlers.forEach(fn => fn(newPrice))
})

export const subcribeToTicker = (ticker, cb) => {
    const subscribers = tickersHandlers.get(ticker) || []
    tickersHandlers.set(ticker, [...subscribers, cb]);

    if (socket.readyState === WebSocket.OPEN) {
      subcribeToTickerWS(ticker, 'USD')
      return;
    }
    socket.addEventListener(
        "open",
        () => {
          subcribeToTickerWS(ticker, 'USD')
        },
        { once: true }
      );
}

export const unsubscribeFromTicker = (ticker) => {
  console.log(ticker, tickersBTC.indexOf(ticker));
  if (tickersBTC.indexOf(ticker) == -1) {
    unsubscribeFromTickerWS(ticker, 'USD');
  } else {
    unsubscribeFromTickerWS(ticker, 'BTC')
  }
  tickersHandlers.delete(ticker);
}