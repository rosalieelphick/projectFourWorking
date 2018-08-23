
const app = {};

app.apiKey = "Aps9Ru4I2VE16SVT-Uqa1m0_dnEV3AI15tq6yOCMbctU6mkJFtcs4CQiiet2bJvX";
app.cityAndCountry = ", Toronto, Canada";
app.map;
app.searchManager;
let points;

app.determineResults = (results) => {

    let resultString = "";

    if (results > 450) {
        resultString = $(`<p>${results} : Severe </p>`);
    }
    else if (results > 350) {
        resultString = $(`<p>${results} : Extremely high </p>`);
    }
    else if (results > 250) {
        resultString = $(`<p>${results} : High </p>`);
    }
    else if (results > 150) {
        resultString = $(`<p>${results} : Moderate</p>`);
    }
    else if (results > 50) {
        resultString = $(`<p>${results} : Low </p>`);
    }
    else if (results >= 0) {
        resultString = $(`<p>${results} : Negligible</p>`);
    }
    else {
        resultString = $(`No results Found, Try Again`);
    }

    $(".textResults").append(resultString);
}

app.getMap = function () {
    let navigationBarMode = Microsoft.Maps.NavigationBarMode;
    app.map = new Microsoft.Maps.Map("#resultMap", {
        credentials: app.apiKey,
        center: new Microsoft.Maps.Location(43.6482, -79.39782),
        mapTypeId: Microsoft.Maps.MapTypeId.road,
        navigationBarMode: navigationBarMode.minified,
        zoom: 12
    });

    // defining points of polygon here
    points = [
        new Microsoft.Maps.Location(43.577539, -79.531720),
        new Microsoft.Maps.Location(43.667959, -79.567202),
        new Microsoft.Maps.Location(43.728789, -79.282219),
        new Microsoft.Maps.Location(43.646752, -79.256077),
        new Microsoft.Maps.Location(43.577539, -79.531720),
    ]

    let color = new Microsoft.Maps.Color(150,0,0,255)
    let polygon = new Microsoft.Maps.Polygon(points, color);
    // pushing the polygon into the map
    app.map.entities.push(polygon);

}

// function to check if the point is acutally in the polygon
app.pointInPolygon = function(pin) {
    let lon = pin.geometry.x;
    let lat = pin.geometry.y;

    let j = points.length-1;
    let inPoly = false;

    for (let i = 0; i < points.length; i = i + 1) {
        if (points[i].longitude<lon && points[j].longitude>=lon || points[j].longitude<lon && points[i].longitude>=lon) {
            if (points[i].latitude+(lon-points[i].longitude)/(points[j].longitude-points[i].longitude)*(points[j].latitude-points[i].latitude)<lat) {
                inPoly=!inPoly;
            }
        }
        j=i;
    }
    if (inPoly) {
        app.map.entities.push(pin);
    } else {
        alert("this location is not in Toronto")
    }

}

app.geocodeQuery = function (query) {
    query = query.toLowerCase()
        .split(" ")
        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
        .join(" ");
    // if the search manager isn't defined yet, create an instance of the search manager class
    if (!app.searchManager) {
        Microsoft.Maps.loadModule("Microsoft.Maps.Search", function () {
            app.searchManager = new Microsoft.Maps.Search.SearchManager(app.map);
            app.geocodeQuery(query);
        })
    } else {
        let searchRequest = {
            where: query,
            callback: function (r) {
                // get the results from the geocoding function 
                if (r && r.results && r.results.length > 0) {
                    let firstResult = r.results[0]

                    let pin = new Microsoft.Maps.Pushpin(firstResult.location, {
                        color: "red",
                        title: query
                    });

                    let locationX = firstResult.location.longitude;
                    let locationY = firstResult.location.latitude;

                    // make the database call here
                    app.getCrimeData(locationX, locationY);

                    // make the call to check if within polygon here
                    app.pointInPolygon(pin);

                    // app.map.entities.push(pin);
                    app.map.setView({ bounds: firstResult.bestView });
                }
            },
            errorCallback: function (e) {
                alert("no results found")
            }
        }

        app.searchManager.geocode(searchRequest);

    } // else statement ends
} // geocode query ends


app.getCrimeData = function (locationX, locationY) {
    const url = "https://services.arcgis.com/S9th0jAJ7bqgIRjw/arcgis/rest/services/Bicycle_Thefts/FeatureServer/0/query?";

    $.ajax({
        url: url,
        method: "GET",
        dataType: "json",
        data: {
            geometry: `${locationX},${locationY}`,
            geometryType: "esriGeometryPoint",
            inSR: 4326,
            spatialRel: "esriSpatialRelIntersects",
            distance: 1000,
            units: "esriSRUnit_Meter",
            f: "json",
            outSR: 4326,
            outFields: "*",
            where: "Occurrence_Year > 2016"
        }
    }).then((res) => {
        let results = res.features.length;
        app.determineResults(results);
    });

}


app.submitQuery = function () {
    $(".addressQuery").on("submit", function (e) {
        e.preventDefault();
        let addressString = $(".queryText").val().trim();
        app.geocodeQuery(`${addressString}${app.cityAndCountry}`);
    });
}


app.init = function () {
    app.getMap();
    app.submitQuery();
}

$(function () {
    app.init();
})