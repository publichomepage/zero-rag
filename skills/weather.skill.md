---
name: get_current_weather
description: Get the current weather in a given location
---

## Arguments
- location: string (city name, e.g. "London")
- unit: string ("celsius" or "fahrenheit")

## API
Endpoint: https://wttr.in/{location}?format=j1
Method: GET

## Response Mapping
temperature_c: current_condition[0].temp_C
temperature_f: current_condition[0].temp_F
description: current_condition[0].weatherDesc[0].value
humidity: current_condition[0].humidity
