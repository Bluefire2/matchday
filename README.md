# matchday [![Build Status](https://travis-ci.org/Bluefire2/matchday.svg?branch=master)](https://travis-ci.org/Bluefire2/matchday) [![Coverage Status](https://coveralls.io/repos/github/Bluefire2/matchday/badge.svg?branch=master)](https://coveralls.io/github/Bluefire2/matchday?branch=master)

matchday is a Node.js module that calculates the approximate probabilities of potential team standings in football (soccer) leagues after a certain period of time.

### Installation
You can install matchday from NPM with `npm i -S matchday`.

### Usage
 When running matchday, specify the league code, the number of days to look ahead, and, optionally, the amount of times to run the random sampler:

```javascript
const matchday = require('matchday');

matchday('PREMIER', 7, 1000000).then(standings => {
    // do stuff
});
```

Currently supported leagues are:

| League        | Code          |
| ------------- |:-------------:|
| British Premier League      | PREMIER |
| Campeonato Brasileiro Série A      | BRASILEIRAO      |

### Output schema
The value of the `Promise` is a `Map` of team standings to probabilities. A team standing is an array of objects of the following form:

```javascript
{
    "team": "Manchester City", // the name of the team
    "goalDiff": 79, // the goal difference
    "points": 100 // the amount of points that the team has
}
```

The team standings are keys of the `Map`, and so are in text form as JSON. The value of each standing key is its approximate probability, as calculated by the sampler.

### Known issues
Note that this project is very new and probably quite buggy. There is a known issue where there is a socket hang up after processing a large number of samples.
