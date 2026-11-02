import {createServer} from 'node:http';
import {handler,catalogs} from './app.js';

const PORT=Number(process.env.PORT??5173);
createServer(handler).listen(PORT,()=>{
 const sizes=Object.entries(catalogs).map(([id,c])=>`${id} ${c.items.length}`).join(', ');
 console.log(`TASTIQ prototype: http://localhost:${PORT}  (${sizes})`);
});
