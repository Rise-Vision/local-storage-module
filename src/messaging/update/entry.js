module.exports = {
  validateAndFilter(files) {
    if (!files || !Array.isArray(files) || files.length === 0) {return false;}

    const filesForUpdate = files.filter((file)=>{
      return file.filePath && file.version && file.token;
    });

    if (filesForUpdate.length === 0) {return false;}

    return filesForUpdate;
  }
};
