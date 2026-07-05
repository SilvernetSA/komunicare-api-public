var mongoose = require('mongoose');
var config = require('./config');
import { SubscriptionPersistenceModel } from './nest/common/models/subscription.persistence-model';


mongoose.connect(config.getConfig().databaseUrl, { useNewUrlParser: true });
mongoose.connection.on('connected', async () => {
  console.log('Connected to database at ' + config.getConfig().databaseUrl);
  /** seeds(); **/
  try {
    // console.log('🔹 Eliminando índices de la colección "subscriptions"...');
    await SubscriptionPersistenceModel.collection.dropIndexes(); // Elimina todos los índices excepto _id
    // console.log('✅ Índices eliminados correctamente');
  } catch (error) {
    console.error('❌ Error al eliminar los índices:', error);
  }
});
mongoose.connection.on('error', (err: any) =>
  console.log('Database connection error: ' + err)
);
mongoose.connection.on('disconnected', () =>
  console.log('Disconnected from database')
);

process.on('SIGINT', () =>
  mongoose.connection.close(() => {
    console.log('Finished App and disconnected from database');
    process.exit(0);
  })
);


export const conn = mongoose.connection
