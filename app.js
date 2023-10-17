const express = require("express");
const app = express();
const http = require("http");
const bodyParser = require("body-parser");
const axios = require("axios"); // Import 'axios' instead of 'request'
const moment = require("moment");
const apiRouter = require('./api');
const cors = require("cors");


const port = 5000;
const hostname = "localhost";
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

const server = http.createServer(app);

// ACCESS TOKEN FUNCTION - Updated to use 'axios'
async function getAccessToken() {
  const consumer_key = process.env.DARAJA_KEY; // REPLACE IT WITH YOUR CONSUMER KEY
  const consumer_secret = process.env.DARAJA_SECRET; // REPLACE IT WITH YOUR CONSUMER SECRET
  const url =
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

  const auth =
    "Basic " +
    new Buffer.from(consumer_key + ":" + consumer_secret).toString("base64");

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: auth,
      },
    });
    const accessToken = response.data.access_token;
    return accessToken;
  } catch (error) {
    throw error;
  }
}

app.get("/", (req, res) => {
  var timeStamp = moment().format("YYYYMMDDHHmmss");
  console.log("This is a timestamp",timeStamp);
   res.json({
     message: "An Mpesa API",
     timestamp: timeStamp
   });
});

//ACCESS TOKEN ROUTE
app.get("/access_token", (req, res) => {
  getAccessToken()
    .then((accessToken) => {
      res.send("😀 Your access token is " + accessToken);
    })
    .catch((err) => {
      console.log(err)
      res.status(500).json(err);
    })
});

//MPESA STK PUSH ROUTE
app.get("/stkpush", (req, res) => {
  getAccessToken()
    .then((accessToken) => {
      const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
      const auth = "Bearer " + accessToken;
      const password = new Buffer.from(process.env.DARAJA_SHORTCODE +
      process.env.DARAJA_PASS_KEY +
      moment().format("YYYYMMDDHHmmss")).toString("base64")

      axios
        .post(
          url,
          {
            BusinessShortCode: process.env.DARAJA_SHORTCODE,
            Password: password,
            Timestamp: moment().format("YYYYMMDDHHmmss"),
            TransactionType: "CustomerPayBillOnline",
            Amount: "1",
            PartyA: "254799273498",
            PartyB: process.env.DARAJA_SHORTCODE,
            PhoneNumber: "254799273498",
            CallBackURL: process.env.DARAJA_CALLBACK_URI,
            AccountReference: "UMESKIA PAY",
            TransactionDesc: "Mpesa Daraja API stk push test",
          },
          {
            headers: {
              Authorization: auth,
            },
          }
        )
        .then((response) => {
          console.log(response)
          res.send("😀 Request is successful done ✔✔. Please enter mpesa pin to complete the transaction" + response);
        })
        .catch((error) => {
          console.log(error);
          res.status(500).json({
            message: "❌ Request failed",
            error: error
          });
        });
    })
    .catch((err) => {
      res.status(500).json(
        {
          error: err
        }
      )
    });
});

app.post('/callback', (req, res, next) => {
  console.log("This is res", res)
})

// REGISTER URL FOR C2B
app.get("/registerurl", (req, resp) => {
  getAccessToken()
    .then((accessToken) => {
      const url = "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl";
      const auth = "Bearer " + accessToken;
      axios
        .post(
          url,
          {
            ShortCode: process.env.DARAJA_SHORTCODE,
            ResponseType: "Complete",
            ConfirmationURL: process.env.DARAJA_CONFIRM,
            ValidationURL: process.env.DARAJA_VALID,
          },
          {
            headers: {
              Authorization: auth,
            },
          }
        )
        .then((response) => {
          resp.status(200).json(response.data);
        })
        .catch((error) => {
          resp.status(500).json({
            message: "❌ Request failed",
            error:  error
          });
        });
    })
    .catch(console.log);
});

app.get("/confirmation", (req, res) => {
  console.log("All transaction will be sent to this URL");
  res.json({
    message: "Confirmed URI"
  })
  console.log(req.body);
});

app.get("/validation", (req, resp) => {
  console.log("Validating payment");
    resp.json({
    message: "Validated URI"
  })
  console.log(req.body);
});

// B2C ROUTE OR AUTO WITHDRAWAL
app.get("/b2curlrequest", (req, res) => {
  getAccessToken()
    .then((accessToken) => {
      const securityCredential = process.env.SECURITY_CRED
      const url = "https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest";
      const auth = "Bearer " + accessToken;
      axios
        .post(
          url,
          {
            InitiatorName: "testapi",
            SecurityCredential: securityCredential,
            CommandID: "PromotionPayment",
            Amount: "1",
            PartyA: "4062753",
            PartyB: "254799273498",
            Remarks: "Withdrawal",
            QueueTimeOutURL: "https://mydomain.com/b2c/queue",
            ResultURL: "https://mydomain.com/b2c/result",
            Occasion: "Withdrawal",
          },
          {
            headers: {
              Authorization: auth,
            },
          }
        )
        .then((response) => {
          res.status(200).json(response.data);
        })
        .catch((error) => {
          console.log(error);
          res.status(500).send("❌ Request failed" + error);
        });
    })
    .catch((err) => {
      res.status(500).json({
        message: "An Error Occurred while fetching Access Token",
        error: err
      })
    });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
