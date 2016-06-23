import { ICommand } from './ICommand';
import * as Request from 'request';


var Fc = require('forecast');

interface Weather{
  time: number;
  summary: string;
  temperature: number;
}

export class Forecast implements ICommand {
  command = /forecast$/;
  help = "Shows the forecast for the given location.";
  usage = "Usage: /forecast [location]";
  fc: any;
  geocoder: any;

  url = "https://api.forecast.io/forecast/";
  apikey: string;

  constructor(forecastApi:string, geocodeProvider: string, geocodeApikey?: string) {
    this.apikey = forecastApi;
    this.fc = new Fc({
      service: 'forecast.io',
      key: forecastApi,
      units: 'celcius', // Only the first letter is parsed 
      cache: true,      // Cache API requests? 
      ttl: {            // How long to cache requests. Uses syntax from moment.js: http://momentjs.com/docs/#/durations/creating/ 
        minutes: 27,
        seconds: 45
      }
    });
    this.geocoder = require('node-geocoder')(geocodeProvider, 'https', { apiKey: geocodeApikey });
  }

  // Gets a forecast using lat, long
  private getForecast(lat:Float32Array, long:Float32Array, city:string, country:string, callback: (msg: string) => any): void{
    // this.fc.get([lat, long], function(err, weather) {
    //   if (err) {
    //     callback(err);
    //     return;
    //   }
    //   var respString = `The weather in ${city}, ${country} is ${weather.currently.summary} with a temperature of ${weather.currently.temperature} °C`;
    //   callback(respString);
    // });

    var url = `${this.url}${this.apikey}/${lat},${long}?units=si`;
    Request(url, function(error, response, body) {
      var parsed = JSON.parse(body);
      var weather:Weather[] = <Weather[]>parsed.hourly.data;
      var currently:Weather = <Weather>parsed.currently;
      var forecastString:string = `The weather in ${city}, ${country} is ${currently.summary} with a temperature of ${currently.temperature} °C. Here is a forecast for the coming hours: \r\n`;
      for(var i = 1; i < 4; i++){
        var date = new Date(weather[i].time * 1000);
        forecastString += `\r\n[${date.toLocaleTimeString('en-GB', { hour12: false})}] ${weather[i].summary} with a temperature of ${weather[i].temperature} °C`;
      }
      callback(forecastString);
    });
  }

  // Implement the execute command
  exec(msg, reply): void {
    var args:string = msg.args();
    if(args.trim().length == 0){
      reply.text(this.usage);
      return;
    }

    var res = this.geocoder.geocode(args, (err, res) =>{
      if(err){
        return;
      }
      if(res.length == 0){
        reply.text("Cannot find the place you are looking for.");
        return;
      }      
      this.getForecast(res[0].latitude,res[0].longitude, res[0].city, res[0].country, function(str){
        reply.text(str);
      });
    });
  }
}
