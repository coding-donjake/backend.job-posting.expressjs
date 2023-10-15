import * as bcrypt from 'bcrypt';
import * as util from 'util';

class HashService {
  static instance: HashService;
  
  public hashPassword = util.promisify(bcrypt.hash);
  public comparePasswords = util.promisify(bcrypt.compare);

  static getInstance(): HashService {
    if(!HashService.instance) {
      HashService.instance = new HashService();
      console.log('New hash service instance has been created.');
    }
    return HashService.instance;
  }
}

export default HashService;