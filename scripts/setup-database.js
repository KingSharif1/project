const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://ocjqsnocuqyumoltighi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9janFzbm9jdXF5dW1vbHRpZ2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MjE5ODUsImV4cCI6MjA3MDA5Nzk4NX0.V05Bv2bHsnoWbd5AjhPrLMV63-3lP0SQtW3bZ4S8iEg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');

  try {
    // 1. Apply real-time tracking migration
    console.log('📍 Creating realtime_driver_locations table...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/20240115000000_create_realtime_driver_locations.sql'),
      'utf8'
    );

    const { error: migrationError } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (migrationError) {
      console.log('⚠️  Migration may already exist or need manual application');
      console.log('   You can apply it manually in Supabase Dashboard > SQL Editor');
    } else {
      console.log('✅ Real-time tracking table created!\n');
    }

    // 2. Check if we have any data
    console.log('🔍 Checking existing data...');
    
    const { data: facilities, error: facError } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(5);
    
    const { data: drivers, error: drvError } = await supabase
      .from('drivers')
      .select('id, name')
      .limit(5);
    
    const { data: trips, error: tripError } = await supabase
      .from('trips')
      .select('id, trip_number')
      .limit(5);

    console.log(`   Facilities: ${facilities?.length || 0}`);
    console.log(`   Drivers: ${drivers?.length || 0}`);
    console.log(`   Trips: ${trips?.length || 0}\n`);

    if ((facilities?.length || 0) === 0) {
      console.log('📦 Database is empty. You need to add data!');
      console.log('\n💡 Options:');
      console.log('   1. Use Supabase Dashboard to add data manually');
      console.log('   2. Run the seed script from the web app');
      console.log('   3. Import data via CSV in Supabase Dashboard\n');
    } else {
      console.log('✅ Database has data! Your website should work.\n');
    }

    console.log('🎉 Setup complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Start your web app: cd web && npm run dev');
    console.log('   2. Login with: admin@fwmc.com / Admin123!');
    console.log('   3. Check the Operations section\n');

  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    console.log('\n💡 Manual steps:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Run the migration from: supabase/migrations/20240115000000_create_realtime_driver_locations.sql');
    console.log('   3. Add test data through the Dashboard or web app\n');
  }
}

setupDatabase();
