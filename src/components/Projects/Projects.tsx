import { FC } from 'react';
import {
    VStack,
    Container,
    Heading,
    Wrap,
    WrapItem,

    useMediaQuery
} from '@chakra-ui/react';
import ProjectCard from './ProjectCard';
import { Element } from 'react-scroll';
import {Fade} from 'react-awesome-reveal';
import LinkIconButton from './LinkIconButton';
import { projectData } from '../../data/projectData';




const Projects: FC = () => {
    const [isMobile] = useMediaQuery('(min-width: 764px)')

    return (
        <Element name='projects'>
            <Container maxW={'10xl'} p={6.75} mt={20} mb={[10, 20]} px={[0, 10]}>
                <VStack spacing={8}>
                    <Fade>
                        <Heading as='h2'>Experience</Heading>
                    </Fade>
                    <Wrap spacing='20px' justify='center'>
                        {
                            projectData.slice(0, isMobile ? 6 : 3).map((data) => (
                                <WrapItem p={5}>
                                    <ProjectCard
                                        name={data['name'] || ''}
                                        type={data['type'] || ''}
                                        id={data['id'] || ''}
                                        tags={data['tags'] || []}
                                        imageSrc={data['imageSrc'] || ''}
                                        description={data['description'] || ''}
                                        links={data['links']?.map((link) => (
                                            <LinkIconButton
                                                href={link.link}
                                                icon={link.icon}
                                            />
                                        ))}
                                        headerLink={data['headerLink'] || ''}
                                    />
                                </WrapItem>
                            ))
                        }

                    </Wrap>
                
                </VStack>
            </Container>
        </Element>
    );
};

export default Projects;