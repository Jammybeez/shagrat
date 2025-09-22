import { db } from "@/lib/db";

import { faker } from '@faker-js/faker'



async function main() {

createUsers()

}


async function createUsers() {
    const names: string[] = createNames(faker.number.int(10));

    await Promise.all(names.map((name) => 
        db.user.create({
            data: {
                userName: name,
                lastPurchase: faker.date.past(),
                totalPurchases: faker.number.int(10),
            },
        })
    ));
}


function createNames(num: number): string[] {
    const names = Array(num)
    for (let i = 0; i < num; num ++) {
        names[num] = faker.person.firstName()
    }
    return names;
}

main()