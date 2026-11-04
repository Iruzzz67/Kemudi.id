mergeInto(LibraryManager.library, {
    GetAuthToken: function () {
        var authToken = (window.kemudiAuthToken || '');
        var bufferSize = lengthBytesUTF8(authToken) + 1;
        var buffer = _malloc(bufferSize);
        stringToUTF8(authToken, buffer, bufferSize);
        return buffer;
    },

    GetVehicleType: function () {
        var vehicleType = (window.kemudiVehicleType || '');
        var bufferSize = lengthBytesUTF8(vehicleType) + 1;
        var buffer = _malloc(bufferSize);
        stringToUTF8(vehicleType, buffer, bufferSize);
        return buffer;
    }
});
