const { createUserIfNotExists } = require('../models/userModel.js');

exports.findOrCreate = async (profile) => {
  return await createUserIfNotExists(profile);
};