import { BaseRepository } from './BaseRepository.js';
import UserInterests from '../models/UserInterests.js';

export class UserInterestsRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'user_interests');
  }

  async findByUserId(user_id) {
    const [rows] = await this.pool.query(
      `SELECT * FROM ${this.table} WHERE user_id=?`,
      [user_id]
    );

    return rows.map(row => new UserInterests(row));
  }

  async findByUserAndInterest(user_id, interest) {
    const [rows] = await this.pool.query(
      `SELECT * FROM ${this.table} WHERE user_id=? AND interest=? LIMIT 1`,
      [user_id, interest]
    );

    return rows.length ? new UserInterests(rows[0]) : null;
  }

  async addInterest(user_id, interest, id) {
    await this.pool.query(
      `INSERT INTO ${this.table} (id, user_id, interest) VALUES (?, ?, ?)`,
      [id, user_id, interest]
    );

    return new UserInterests({
      id,
      user_id,
      interest,
      created_at: new Date()
    });
  }

  async removeInterest(user_id, interest) {
    const [result] = await this.pool.query(
      `DELETE FROM ${this.table} WHERE user_id=? AND interest=?`,
      [user_id, interest]
    );

    return result.affectedRows > 0;
  }

  async deleteById(id) {
    return super.deleteById(id);
  }
}
