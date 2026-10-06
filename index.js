// Головний файл CLI
import { Command } from 'commander';
import fs from 'fs';

const program = new Command();

// --- Допоміжна функція для читання JSON з обробкою помилок ---
function loadData(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`Помилка: Файл "${filePath}" не знайдено.`);
            process.exit(1);
        }
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error(`Помилка обробки файлу: ${error.message}`);
        process.exit(1);
    }
}

// Опис програми та глобальна опція шляху до файлу
program
    .name('rozklad-cli')
    .description('CLI-програма для перегляду розкладу занять')
    .version('1.0.0')
    .option('-f, --file <path>', 'шлях до JSON-файлу з розкладом', 'rozkladpar.json');

// =========================================================
// ЧАСТИНА 3: Загальні можливості (для всіх варіантів)
// =========================================================

// 1. Перелік: показати стислий список з опцією обмеження
program
    .command('list')
    .description('показати список усіх предметів')
    .option('-l, --limit <number>', 'обмежити кількість виведених предметів')
    .action((options) => {
        const data = loadData(program.opts().file);
        let classes = data.classes;

        if (options.limit) {
            const limitNum = parseInt(options.limit, 10);
            if (isNaN(limitNum)) {
                console.error('Помилка: Ліміт має бути числом.');
                process.exit(1);
            }
            classes = classes.slice(0, limitNum);
        }

        console.log(`--- Список предметів групи ${data.groupName} ---`);
        classes.forEach((c, i) => console.log(`${i + 1}. ${c.subject}`));
    });

// 2. Один елемент: показати повну інформацію про предмет за назвою
program
    .command('info <subjectName>')
    .description('показати детальну інформацію про конкретний предмет')
    .action((subjectName) => {
        const data = loadData(program.opts().file);
        const item = data.classes.find(c => c.subject.toLowerCase().includes(subjectName.toLowerCase()));

        if (!item) {
            console.error(`Помилка: Предмет, що містить "${subjectName}", не знайдено.`);
            process.exit(1);
        }
        console.log('Деталі предмета:');
        console.log(item);
    });

// 3. Окреме поле: показати викладача для вказаного предмета
program
    .command('teacher-of <subjectName>')
    .description('показати викладача для вказаного предмета')
    .action((subjectName) => {
        const data = loadData(program.opts().file);
        const item = data.classes.find(c => c.subject.toLowerCase().includes(subjectName.toLowerCase()));

        if (!item) {
            console.error(`Помилка: Предмет "${subjectName}" не знайдено.`);
            process.exit(1);
        }
        if (item.lecture) {
            console.log(`Предмет "${item.subject}" викладає: ${item.lecture}`);
        } else {
            console.log(`Для предмета "${item.subject}" викладача не вказано (null).`);
        }
    });

// =========================================================
// ЧАСТИНА 4: Можливості варіанта №1 "Розклад занять"
// =========================================================

// 4.1. Заняття за обраний день тижня
program
    .command('day <dayName>')
    .description('показати заняття на вказаний день тижня')
    .action((dayName) => {
        const data = loadData(program.opts().file);
        const dayClasses = data.classes.filter(c => c.day && c.day.toLowerCase() === dayName.toLowerCase());

        if (dayClasses.length === 0) {
            console.error(`Помилка: На день "${dayName}" занять не знайдено.`);
            process.exit(1);
        }
        console.log(`--- Розклад на ${dayName} ---`);
        dayClasses.forEach(c => console.log(`- ${c.subject} (Ауд. ${c.room || 'Онлайн'})`));
    });

// 4.2. Заняття певного викладача (з прапорцем --remote)
program
    .command('schedule <teacherName>')
    .description('показати заняття вказаного викладача')
    .option('-r, --remote', 'показати лише дистанційні заняття')
    .action((teacherName, options) => {
        const data = loadData(program.opts().file);
        let teacherClasses = data.classes.filter(c => c.lecture && c.lecture.toLowerCase().includes(teacherName.toLowerCase()));

        if (options.remote) {
            teacherClasses = teacherClasses.filter(c => c.isRemote);
        }

        if (teacherClasses.length === 0) {
            console.error(`Помилка: Занять для викладача "${teacherName}" (Дистанційно: ${options.remote ? 'Так' : 'Ні'}) не знайдено.`);
            process.exit(1);
        }
        console.log(`--- Заняття викладача ${teacherName} ---`);
        teacherClasses.forEach(c => console.log(`- ${c.subject} (Дистанційно: ${c.isRemote ? 'Так' : 'Ні'})`));
    });

// 4.3. Розклад для чисельника чи знаменника (з урахуванням щотижневих)
program
    .command('week <type>')
    .description('показати розклад для типу тижня (чисельник або знаменник)')
    .action((type) => {
        const data = loadData(program.opts().file);
        const weekTypeLower = type.toLowerCase();

        const validTypes = ['чисельник', 'знаменник'];
        if (!validTypes.includes(weekTypeLower)) {
            console.error(`Помилка: Невідомий тип тижня "${type}". Використовуйте "чисельник" або "знаменник".`);
            process.exit(1);
        }

        const filtered = data.classes.filter(c => {
            const wType = c.weekType.toLowerCase();
            return wType.includes(weekTypeLower) || wType.includes('кожного тижня');
        });

        if (filtered.length === 0) {
            console.error(`Помилка: Занять для типу тижня "${type}" не знайдено.`);
            process.exit(1);
        }

        console.log(`--- Розклад (${type} + кожного тижня) ---`);
        filtered.forEach(c => console.log(`[${c.weekType}] ${c.subject}`));
    });

program.parse(process.argv);